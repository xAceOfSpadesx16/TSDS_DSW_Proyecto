// =============================================================================
// historyStore
//
// Mantiene la lista de sorteos para alimentar el panel lateral. Combina
// dos fuentes:
// 1. Invitado: mirror local en memoria (funciona offline o sin login),
//    acotado a las últimas MAX_LOCAL_ENTRIES operaciones.
// 2. Usuario logueado: los sorteos se persisten vía
//    `historyRepository.create` y se releen del backend con
//    `historyRepository.list`. La paginación la maneja el store
//    (`currentPage` / `lastPage`) para el botón "cargar más".
//
// Cuando hay sesión, la lista en memoria refleja lo que devuelve el
// backend: los ids son los UUID del servidor, así que borrar o limpiar
// alcanza el backend. Sin sesión, los ids son `local-*` y solo viven en
// memoria.
//
// Errores del backend en `add` NO abortan la acción local (modo
// "graceful degradation"); en `load` / `loadMore` tampoco, para no dejar
// el panel en blanco si la API no responde.
// =============================================================================

import { create } from 'zustand';

import type { CreateHistoryPayload, HistoryRecord, ModuleName } from '../domain/types';
import { ApiError } from '../domain/types';
import { historyRepository } from '../repositories/historyRepository';
import { useAuthStore, selectIsAuthenticated } from './authStore';

export interface LocalHistoryEntry {
  /** id local estable para key de React; los del backend son UUIDs. */
  id: string;
  module: ModuleName;
  description: string;
  timestamp: string;
  /** `true` si fue confirmado por el backend; `false` si solo es local. */
  synced: boolean;
  /**
   * Sorteos que fallaron al guardarse con sesión activa, pendientes de
   * reintento. Viven solo en memoria (se pierden al recargar) y guardan el
   * id del usuario dueño para no enviarlos nunca con otra cuenta.
   */
  pending?: PendingDraw;
}

/** Un sorteo que no llegó al backend y espera reintentarse. */
export interface PendingDraw {
  /** Cuerpo que se envió (o intentó enviarse) a `POST /api/history`. */
  record: CreateHistoryPayload;
  /** `id` del usuario con el que se sorteó. */
  userId: number;
}

/** Tope de entradas en memoria para invitados. Con sesión no aplica. */
const MAX_LOCAL_ENTRIES = 20;

/** Tamaño de página pedido al backend. */
const PAGE_SIZE = 20;

function newLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Los ids del backend son UUID; los del invitado llevan el prefijo `local-`. */
function isLocalId(id: string): boolean {
  return id.startsWith('local-');
}

/** Proyecta un registro del backend a la fila que renderiza el panel. */
function toEntry(record: HistoryRecord): LocalHistoryEntry {
  return {
    id: record.id,
    module: record.module_name,
    description: record.action,
    timestamp: record.created_at,
    synced: true,
  };
}

export interface HistoryState {
  entries: LocalHistoryEntry[];
  /** Página actual del backend; 1 mientras no se haya cargado nada. */
  currentPage: number;
  /** Última página disponible según el backend; 1 por defecto. */
  lastPage: number;
  /** `true` mientras hay una request de historial en vuelo. */
  loading: boolean;
  /**
   * Último error de sincronización, o `null` si todo salió bien. La UI lo
   * muestra en línea; se limpia al empezar la siguiente operación.
   */
  error: string | null;
  add(payload: { module: ModuleName; description: string; record: CreateHistoryPayload }): Promise<void>;
  /**
   * Reenvía los pendientes del usuario indicado, en orden, y recién después
   * trae la página 1 del backend.
   *
   * Los que se guardan dejan de ser pendientes; los que vuelven a fallar
   * se conservan en la lista después del `load()`. Los pendientes de otro
   * usuario se descartan: nunca se envían con otra cuenta. Sin sesión no
   * hace nada.
   */
  load(): Promise<void>;
  /** Trae la página siguiente y la agrega. Sin sesión, no hace nada. */
  loadMore(): Promise<void>;
  /** Borra una entrada. Con sesión y UUID, borra en el backend; si no, solo en memoria. */
  remove(id: string): Promise<void>;
  /** Vacía la lista. Con sesión, borra todos los registros en el backend. */
  clear(): Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  currentPage: 1,
  lastPage: 1,
  loading: false,
  error: null,

  async add({ module, description, record }) {
    // Todo intento de operación limpia el error anterior: si esta vez sale
    // bien, el mensaje viejo ya no describe la situación.
    set({ error: null });

    // 1) Mirror local inmediato (optimista). El UI ve la nueva entrada
    //    incluso si el backend tarda o falla.
    const localEntry: LocalHistoryEntry = {
      id: newLocalId(),
      module,
      description,
      timestamp: new Date().toISOString(),
      synced: false,
    };
    const authenticated = selectIsAuthenticated(useAuthStore.getState());

    set((s) => ({
      entries: authenticated
        ? [localEntry, ...s.entries]
        : [localEntry, ...s.entries].slice(0, MAX_LOCAL_ENTRIES),
    }));

    // 2) Si hay sesión intentamos sincronizar con el backend.
    if (!authenticated) {
      return;
    }
    try {
      await historyRepository.create(record);
      // Marcamos como sincronizada la entry local que acabamos de crear.
      // Usa el id local, no la descripción, así dos sorteos idénticos
      // seguidos no se marcan entre sí.
      set((s) => ({
        entries: s.entries.map((e) =>
          e.id === localEntry.id ? { ...e, synced: true } : e,
        ),
      }));
    } catch (err) {
      // Degradación agraciada: la entrada local queda en pantalla con
      // `synced: false` y el error queda visible en el panel. Con sesión
      // activa además queda pendiente: se reintentará al recuperar la
      // sesión del mismo usuario.
      const userId = useAuthStore.getState().user?.id;
      if (userId !== undefined && userId !== null) {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === localEntry.id ? { ...e, pending: { record, userId } } : e,
          ),
        }));
      }
      reportSyncError('guardar el sorteo', err);
      return;
    }

    // El backend respondió bien: es un buen momento para reintentar los
    // pendientes que quedaron de guardados fallidos anteriores.
    await retryPendingDraws();
  },

  async load() {
    const auth = useAuthStore.getState();
    if (!selectIsAuthenticated(auth)) {
      return;
    }
    set({ loading: true, error: null });

    // Los pendientes van antes que el `load()`: si uno falla, tiene que
    // sobrevivir al reemplazo de la lista. `retryPendingDraws` comparte el
    // reintento en vuelo con los que disparan `add()` y el health check.
    await retryPendingDraws();

    try {
      const res = await historyRepository.list({ page: 1, per_page: PAGE_SIZE });
      const fromServer = res.data.map(toEntry);
      // Los pendientes que sobrevivieron al reintento se agregan arriba de
      // la lista del servidor: son sorteos que el backend todavía no tiene.
      // Conservan su `pending` para que la UI los marque "sin guardar".
      const stillPending = useHistoryStore
        .getState()
        .entries.filter((e) => e.pending !== undefined);

      set({
        entries: [...stillPending, ...fromServer],
        currentPage: res.meta.current_page,
        lastPage: res.meta.last_page,
        loading: false,
      });
    } catch (err) {
      // Si el token venció, el httpClient ya limpió la sesión: no
      // dejamos una lista de un usuario deslogueado en pantalla.
      if (selectIsAuthenticated(useAuthStore.getState())) {
        reportSyncError('cargar historial', err);
      }
      set({ loading: false });
    }
  },

  async loadMore() {
    const { currentPage, lastPage, loading } = get();
    if (loading || currentPage >= lastPage) {
      return;
    }
    if (!selectIsAuthenticated(useAuthStore.getState())) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const next = currentPage + 1;
      const res = await historyRepository.list({ page: next, per_page: PAGE_SIZE });
      set((s) => ({
        // Deduplicamos por id: si el usuario sorteó entre medio, el
        // backend puede repetir un registro en la página siguiente.
        entries: [
          ...s.entries,
          ...res.data.map(toEntry).filter((e) => !s.entries.some((x) => x.id === e.id)),
        ],
        currentPage: res.meta.current_page,
        lastPage: res.meta.last_page,
        loading: false,
      }));
    } catch (err) {
      if (selectIsAuthenticated(useAuthStore.getState())) {
        reportSyncError('cargar más historial', err);
      }
      set({ loading: false });
    }
  },

  async remove(id) {
    set({ error: null });

    // Un pendiente nunca llegó al backend: se quita solo de memoria, sin
    // tocar el servidor (no hay nada que borrar allá).
    const isPending = useHistoryStore.getState().entries.some((e) => e.id === id && e.pending);

    // Los ids `local-*` nunca estuvieron en el backend: se quita solo de
    // memoria. Lo mismo sin sesión, donde el historial es local por diseño.
    if (!isPending && selectIsAuthenticated(useAuthStore.getState()) && !isLocalId(id)) {
      try {
        await historyRepository.remove(id);
      } catch (err) {
        reportSyncError('borrar el registro', err);
        // El backend no lo borró: no lo sacamos de la lista para no
        // mostrar un estado que el servidor no tiene.
        return;
      }
    }
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },

  async clear() {
    set({ error: null });

    if (selectIsAuthenticated(useAuthStore.getState())) {
      try {
        await historyRepository.clearAll();
      } catch (err) {
        reportSyncError('limpiar el historial', err);
        return;
      }
    }
    set({ entries: [], currentPage: 1, lastPage: 1, error: null });
  },
}));

/**
 * Reintento en vuelo, compartido por todos los disparadores.
 *
 * `load()`, un guardado exitoso y la recuperación del health check pueden
 * coincidir; las tres llamadas esperan la misma promesa para no mandar dos
 * veces el mismo pendiente.
 */
let inFlightPendingRetry: Promise<void> | null = null;

/**
 * Reintenta los pendientes del usuario actual, si hay sesión.
 *
 * Es la puerta de entrada pública: usada por `load()`, por `add()` después
 * de un guardado exitoso y por `RootLayout` cuando el health check vuelve a
 * responder. Sin sesión no hace nada y nunca corre dos reintentos a la vez.
 */
export function retryPendingDraws(): Promise<void> {
  if (inFlightPendingRetry) {
    return inFlightPendingRetry;
  }

  const auth = useAuthStore.getState();
  const userId = selectIsAuthenticated(auth) ? auth.user?.id : undefined;
  if (userId === undefined || userId === null) {
    return Promise.resolve();
  }

  inFlightPendingRetry = retryPending(userId).finally(() => {
    inFlightPendingRetry = null;
  });
  return inFlightPendingRetry;
}

/**
 * Reenvía, en orden, los sorteos pendientes del usuario indicado.
 *
 * Reglas:
 *   - Los pendientes de OTRO usuario se descartan de la lista: nunca se
 *     envían con otra cuenta (serían sorteos ajenos).
 *   - Los que se guardan dejan de ser pendientes y quedan `synced: true`.
 *   - Los que vuelven a fallar conservan su `pending` para el próximo intento.
 *   - No toca `error`: un reintento fallido es esperado y `load()` va a
 *     mostrar su propio mensaje si tampoco logra cargar la lista.
 *
 * Vive fuera del store porque no necesita `set`: escribe vía
 * `useHistoryStore.setState`, igual que `reportSyncError`.
 */
async function retryPending(userId: number | undefined): Promise<void> {
  if (userId === undefined || userId === null) {
    return;
  }

  const current = useHistoryStore.getState().entries;

  // Primero se descarta lo que pertenece a otra cuenta.
  useHistoryStore.setState({
    entries: current.filter((e) => e.pending === undefined || e.pending.userId === userId),
  });

  // Los del usuario actual, en el orden en que se sortearon.
  const mine = useHistoryStore
    .getState()
    .entries.filter((e) => e.pending?.userId === userId);

  for (const entry of mine) {
    const pending = entry.pending;
    if (!pending) continue;

    try {
      await historyRepository.create(pending.record);
      useHistoryStore.setState((s) => ({
        entries: s.entries.map((e) =>
          e.id === entry.id ? { ...e, synced: true, pending: undefined } : e,
        ),
      }));
    } catch {
      // Sigue pendiente: se conserva la entrada para el próximo `load()`.
    }
  }
}

/**
 * Log uniforme de los fallos de sincronización del historial.
 *
 * Además del `console.warn` (que se mantiene para debugging), deja el
 * mensaje en `error` para que la UI pueda mostrarlo. Un error no-`ApiError`
 * (fallo de red) usa un texto genérico porque no hay mensaje del backend.
 */
function reportSyncError(action: string, err: unknown): void {
  if (err instanceof ApiError) {
    // eslint-disable-next-line no-console
    console.warn(`[historyStore] no se pudo ${action} (${err.status}): ${err.message}`);
    useHistoryStore.setState({ error: err.message });
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[historyStore] no se pudo ${action}:`, err);
    useHistoryStore.setState({ error: `No se pudo ${action}.` });
  }
}

// Selector para evitar renders innecesarios.
export const selectRecentEntries = (s: HistoryState): LocalHistoryEntry[] => s.entries;
