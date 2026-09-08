// =============================================================================
// historyStore
//
// Mantiene en memoria la lista de los últimos 20 sorteos para alimentar el
// panel lateral. Combina dos fuentes:
// 1. Mirror local: cualquier sorteo se empuja al store (funciona offline o
//    sin login).
// 2. Backend: si el usuario está autenticado, también se persiste vía
//    `historyRepository.create`. Errores del backend NO abortan la acción
//    local (modo "graceful degradation").
// =============================================================================

import { create } from 'zustand';

import type { CreateHistoryPayload, ModuleName } from '../domain/types';
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
}

const MAX_ENTRIES = 20;

function newLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface HistoryState {
  entries: LocalHistoryEntry[];
  add(payload: { module: ModuleName; description: string; record: CreateHistoryPayload }): Promise<void>;
  clear(): void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],

  async add({ module, description, record }) {
    // 1) Mirror local inmediato (optimista). El UI ve la nueva entrada
    //    incluso si el backend tarda o falla.
    const localEntry: LocalHistoryEntry = {
      id: newLocalId(),
      module,
      description,
      timestamp: new Date().toISOString(),
      synced: false,
    };
    set((s) => ({
      entries: [localEntry, ...s.entries].slice(0, MAX_ENTRIES),
    }));

    // 2) Si hay sesión intentamos sincronizar con el backend.
    if (!selectIsAuthenticated(useAuthStore.getState())) {
      return;
    }
    try {
      await historyRepository.create(record);
      // Marcamos como sincronizadas las entries del mismo `description`
      // que aún estén con `synced: false`. Es una asociación simple — si
      // el usuario dispara dos sorteos idénticos en el mismo segundo,
      // ambos quedaran marcados, que es el comportamiento esperado.
      set((s) => ({
        entries: s.entries.map((e) =>
          e.id === localEntry.id ? { ...e, synced: true } : e,
        ),
      }));
    } catch (err) {
      // No-op: dejamos la entrada local. Log para debugging.
      if (err instanceof ApiError) {
        // eslint-disable-next-line no-console
        console.warn(`[historyStore] sync falló (${err.status}): ${err.message}`);
      }
    }
  },

  clear() {
    set({ entries: [] });
  },
}));

// Selector para evitar renders innecesarios.
export const selectRecentEntries = (s: HistoryState): LocalHistoryEntry[] => s.entries;