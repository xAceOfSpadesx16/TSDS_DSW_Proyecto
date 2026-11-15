/** Estado del historial de sorteos y su sincronización. */

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

const PAGE_SIZE = 20;

function newLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isLocalId(id: string): boolean {
  return id.startsWith('local-');
}

function toCreatePayload(record: HistoryRecord): CreateHistoryPayload {
  return {
    module_name: record.module_name,
    action: record.action,
    payload: record.payload,
    result: record.result,
  } as CreateHistoryPayload;
}

function toEntry(record: HistoryRecord): LocalHistoryEntry {
  return {
    id: record.id,
    module: record.module_name,
    description: record.action,
    timestamp: record.created_at,
    synced: true,
    record: toCreatePayload(record),
  };
}

/** Estado y acciones del historial. */
export interface HistoryState {
  entries: LocalHistoryEntry[];
  guestEntries: LocalHistoryEntry[];
  guestImportPending: boolean;
  guestImportError: string | null;
  currentPage: number;
  lastPage: number;
  loading: boolean;
  error: string | null;

  /** Agrega un sorteo al historial y lo sincroniza si hay sesión. */
  add(payload: { module: ModuleName; description: string; record: CreateHistoryPayload }): Promise<void>;
  /** Carga el historial guardado en este navegador. */
  loadGuest(): void;
  /** Detecta historial de invitado y abre la oferta de importación. */
  requestGuestImport(): void;
  /** Importa el historial de invitado a la cuenta. */
  importGuestHistory(): Promise<void>;
  /** Cierra la oferta de importación. */
  dismissGuestImport(): void;
  /** Carga la primera página del historial del backend. */
  load(): Promise<void>;
  /** Trae la página siguiente del historial. */
  loadMore(): Promise<void>;
  /** Borra una entrada. */
  remove(id: string): Promise<void>;
  /** Vacía la lista visible y, con sesión, el historial del backend. */
  clear(): Promise<void>;
}

/** Hook del estado del historial. */
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
        const current = isStorageAvailable()
          ? loadGuestHistory()
          : s.guestEntries;
        const next = [localEntry, ...current].slice(0, MAX_GUEST_ENTRIES);
        saveGuestHistory(next);
        return { entries: next, guestEntries: next };
      });
      return;
    }

    set((s) => ({ entries: [localEntry, ...s.entries] }));

    const userId = useAuthStore.getState().user?.id;
    try {
      await historyRepository.create(record);
      set((s) => ({
        entries: s.entries.map((e) =>
          e.id === localEntry.id ? { ...e, synced: true } : e,
        ),
      }));
    } catch (err) {
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

    const inMemoryPending = get().entries.filter(
      (entry) => entry.pending !== undefined,
    );
    set({ loading: true, error: null, entries: inMemoryPending });

    const userId = auth.user?.id;
    if (userId !== undefined && userId !== null) {
      const persisted = loadPendingDraws(userId).filter(
        (entry) => !get().entries.some((current) => current.id === entry.id),
      );
      if (persisted.length > 0) {
        set((s) => ({ entries: [...persisted, ...s.entries] }));
      }
    }

    await retryPendingDraws();

    try {
      const res = await historyRepository.list({ page: 1, per_page: PAGE_SIZE });
      const currentAuth = useAuthStore.getState();
      if (
        !selectIsAuthenticated(currentAuth) ||
        currentAuth.user?.id !== userId
      ) {
        set({ loading: false });
        return;
      }
      const fromServer = res.data.map(toEntry);
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

    if (authenticated && !isPending && !isLocalId(id)) {
      try {
        await historyRepository.remove(id);
      } catch (err) {
        reportSyncError('borrar el registro', err);
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

let inFlightPendingRetry: Promise<void> | null = null;

/** Reintenta los pendientes del usuario actual, sin duplicar llamadas. */
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

async function retryPending(userId: number | undefined): Promise<void> {
  if (userId === undefined || userId === null) {
    return;
  }

  const current = useHistoryStore.getState().entries;

  useHistoryStore.setState({
    entries: current.filter((e) => e.pending === undefined || e.pending.userId === userId),
  });

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
      // Sigue pendiente para el próximo intento.
    }
  }
}

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

/** Selector de las entradas visibles. */
export const selectRecentEntries = (s: HistoryState): LocalHistoryEntry[] => s.entries;
