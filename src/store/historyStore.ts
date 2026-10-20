// =============================================================================
// historyStore
//
// Mantiene la lista de sorteos visible. Combina tres fuentes:
// 1. Invitado: historial persistido en `localStorage` (máximo 100 entradas)
//    a través de `storage.ts`.
// 2. Usuario logueado: historial paginado del backend.
// 3. Pendientes: sorteos que fallaron al guardarse con sesión activa,
//    persistidos por id de usuario y reintentados al recuperar la sesión.
//
// La vista autenticada nunca muestra el historial de invitado: al entrar se
// ofrece importarlo; al salir se vuelve al historial guardado en el navegador.
// =============================================================================

import { create } from 'zustand';

import type { CreateHistoryPayload, HistoryRecord, ModuleName } from '../domain/types';
import { ApiError } from '../domain/types';
import {
  clearGuestHistory,
  clearPendingDraws,
  isStorageAvailable,
  loadGuestHistory,
  loadPendingDraws,
  MAX_GUEST_ENTRIES,
  removePendingDraw,
  saveGuestHistory,
  savePendingDraw,
  type LocalHistoryEntry,
} from '../lib/storage';
import { historyRepository } from '../repositories/historyRepository';
import { useAuthStore, selectIsAuthenticated } from './authStore';

export type { LocalHistoryEntry, PendingDraw } from '../lib/storage';

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
  /** Copia del historial de invitado guardado, para el diálogo de importación. */
  guestEntries: LocalHistoryEntry[];
  /** `true` cuando hay historial de invitado y el usuario acaba de entrar. */
  guestImportPending: boolean;
  /** Error de la última importación de invitado. */
  guestImportError: string | null;
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
  /** Carga el historial guardado en este navegador (modo invitado). */
  loadGuest(): void;
  /** Detecta historial de invitado y abre la oferta de importación. */
  requestGuestImport(): void;
  /** Importa el historial de invitado a la cuenta; conserva lo que falle. */
  importGuestHistory(): Promise<void>;
  /** Cierra la oferta y conserva el historial de invitado. */
  dismissGuestImport(): void;
  load(): Promise<void>;
  /** Trae la página siguiente y la agrega. Sin sesión, no hace nada. */
  loadMore(): Promise<void>;
  /** Borra una entrada. Con sesión y UUID, borra en el backend; si no, solo en memoria. */
  remove(id: string): Promise<void>;
  /** Vacía la lista visible. Con sesión, borra todos los registros del backend. */
  clear(): Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  guestEntries: [],
  guestImportPending: false,
  guestImportError: null,
  currentPage: 1,
  lastPage: 1,
  loading: false,
  error: null,

  async add({ module, description, record }) {
    // Todo intento de operación limpia el error anterior: si esta vez sale
    // bien, el mensaje viejo ya no describe la situación.
    set({ error: null });

    const localEntry: LocalHistoryEntry = {
      id: newLocalId(),
      module,
      description,
      timestamp: new Date().toISOString(),
      synced: false,
      record,
    };
    const authenticated = selectIsAuthenticated(useAuthStore.getState());

    if (!authenticated) {
      set((s) => {
        // `localStorage` es la fuente de verdad; si no está disponible,
        // conservamos lo que ya había en memoria.
        const current = isStorageAvailable()
          ? loadGuestHistory()
          : s.guestEntries;
        const next = [localEntry, ...current].slice(0, MAX_GUEST_ENTRIES);
        saveGuestHistory(next);
        return { entries: next, guestEntries: next };
      });
      return;
    }

    // 1) Mirror local inmediato (optimista). El UI ve la nueva entrada
    //    incluso si el backend tarda o falla.
    set((s) => ({ entries: [localEntry, ...s.entries] }));

    const userId = useAuthStore.getState().user?.id;
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
      // activa además queda pendiente y se persiste por usuario.
      if (userId !== undefined && userId !== null) {
        const pendingEntry: LocalHistoryEntry = {
          ...localEntry,
          pending: { record, userId },
        };
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === localEntry.id ? pendingEntry : e,
          ),
        }));
        savePendingDraw(userId, pendingEntry);
      }
      reportSyncError('guardar el sorteo', err);
      return;
    }

    // El backend respondió bien: es un buen momento para reintentar los
    // pendientes que quedaron de guardados fallidos anteriores.
    await retryPendingDraws();
  },

  loadGuest() {
    const guest = loadGuestHistory();
    set({
      entries: guest,
      guestEntries: guest,
      currentPage: 1,
      lastPage: 1,
      loading: false,
      error: null,
      guestImportPending: false,
      guestImportError: null,
    });
  },

  requestGuestImport() {
    const guest = loadGuestHistory();
    if (guest.length === 0) {
      set({ guestEntries: [], guestImportPending: false, guestImportError: null });
      return;
    }
    set({ guestEntries: guest, guestImportPending: true, guestImportError: null });
  },

  async importGuestHistory() {
    const current = get().guestEntries;
    const guest = current.length > 0 ? current : loadGuestHistory();
    if (guest.length === 0) {
      set({ guestImportPending: false, guestImportError: null });
      return;
    }

    // El historial se guarda con la entrada más reciente primero; el
    // backend debe recibirlo en orden cronológico.
    const ordered = [...guest].reverse();
    let failureIndex = -1;
    for (let i = 0; i < ordered.length; i++) {
      const entry = ordered[i];
      if (!entry.record) {
        failureIndex = i;
        break;
      }
      try {
        await historyRepository.create(entry.record);
      } catch {
        failureIndex = i;
        break;
      }
    }

    if (failureIndex !== -1) {
      // Lo importado ya está en el backend; lo que falló y lo posterior
      // siguen guardados en el navegador, en el orden original.
      const remaining = ordered.slice(failureIndex).reverse();
      saveGuestHistory(remaining);
      const noun = remaining.length === 1 ? 'sorteo' : 'sorteos';
      const message = `No se pudieron importar ${remaining.length} ${noun}. Quedaron guardados en este navegador.`;
      set({
        guestEntries: remaining,
        guestImportError: message,
        error: message,
        guestImportPending: true,
      });
      throw new Error(message);
    }

    clearGuestHistory();
    set({
      guestEntries: [],
      guestImportPending: false,
      guestImportError: null,
      error: null,
    });
    await get().load();
  },

  dismissGuestImport() {
    set({ guestImportPending: false, guestImportError: null, error: null });
  },

  async load() {
    const auth = useAuthStore.getState();
    if (!selectIsAuthenticated(auth)) {
      return;
    }

    // La vista autenticada no mezcla el historial de invitado: al entrar,
    // solo sobreviven los pendientes que ya estaban en memoria. El invitado
    // queda en `storage` para el diálogo de importación o el próximo logout.
    const inMemoryPending = get().entries.filter(
      (entry) => entry.pending !== undefined,
    );
    set({ loading: true, error: null, entries: inMemoryPending });

    // Los pendientes guardados en el navegador se recuperan antes del
    // reintento. Los que ya están en memoria se respetan por id.
    const userId = auth.user?.id;
    if (userId !== undefined && userId !== null) {
      const persisted = loadPendingDraws(userId).filter(
        (entry) => !get().entries.some((current) => current.id === entry.id),
      );
      if (persisted.length > 0) {
        set((s) => ({ entries: [...persisted, ...s.entries] }));
      }
    }

    // Los pendientes van antes que el `load()`: si uno falla, tiene que
    // sobrevivir al reemplazo de la lista. `retryPendingDraws` comparte el
    // reintento en vuelo con los que disparan `add()` y el health check.
    await retryPendingDraws();

    try {
      const res = await historyRepository.list({ page: 1, per_page: PAGE_SIZE });
      const currentAuth = useAuthStore.getState();
      if (
        !selectIsAuthenticated(currentAuth) ||
        currentAuth.user?.id !== userId
      ) {
        // La sesión cambió mientras la request estaba en vuelo: no
        // repoblamos la vista con datos de una cuenta que ya no está.
        set({ loading: false });
        return;
      }
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
    const userId = useAuthStore.getState().user?.id;
    try {
      const next = currentPage + 1;
      const res = await historyRepository.list({ page: next, per_page: PAGE_SIZE });
      const currentAuth = useAuthStore.getState();
      if (
        !selectIsAuthenticated(currentAuth) ||
        currentAuth.user?.id !== userId
      ) {
        set({ loading: false });
        return;
      }
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

    const entry = get().entries.find((e) => e.id === id);
    if (!entry) {
      return;
    }

    const authenticated = selectIsAuthenticated(useAuthStore.getState());
    const pendingUserId = entry.pending?.userId;
    const isPending = pendingUserId !== undefined;

    // Un pendiente nunca llegó al backend: se quita solo de memoria, sin
    // tocar el servidor (no hay nada que borrar allá).
    // Los ids `local-*` nunca estuvieron en el backend: se quita solo de
    // memoria. Lo mismo sin sesión, donde el historial es local por diseño.
    if (authenticated && !isPending && !isLocalId(id)) {
      try {
        await historyRepository.remove(id);
      } catch (err) {
        reportSyncError('borrar el registro', err);
        // El backend no lo borró: no lo sacamos de la lista para no
        // mostrar un estado que el servidor no tiene.
        return;
      }
    }

    if (isPending && pendingUserId !== undefined) {
      removePendingDraw(pendingUserId, id);
    }

    set((s) => {
      const entries = s.entries.filter((e) => e.id !== id);
      if (!authenticated) {
        const guestEntries = s.guestEntries.filter((e) => e.id !== id);
        saveGuestHistory(guestEntries);
        return { entries, guestEntries };
      }
      return { entries };
    });
  },

  async clear() {
    set({ error: null });

    const auth = useAuthStore.getState();
    if (selectIsAuthenticated(auth)) {
      try {
        await historyRepository.clearAll();
      } catch (err) {
        reportSyncError('limpiar el historial', err);
        return;
      }
      const userId = auth.user?.id;
      if (userId !== undefined && userId !== null) {
        clearPendingDraws(userId);
      }
      set({ entries: [], currentPage: 1, lastPage: 1, error: null });
      return;
    }

    clearGuestHistory();
    set({
      entries: [],
      guestEntries: [],
      currentPage: 1,
      lastPage: 1,
      error: null,
    });
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
 *     envían con una cuenta (serían sorteos ajenos).
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
      removePendingDraw(pending.userId, entry.id);
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
