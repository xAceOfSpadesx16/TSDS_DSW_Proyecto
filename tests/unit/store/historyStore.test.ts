import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../src/domain/types';
import { historyRepository } from '../../../src/repositories/historyRepository';
import { selectRecentEntries, useHistoryStore } from '../../../src/store/historyStore';

// El store depende de authStore (para saber si hay sesión) y de historyRepository.
// Ambas se sustituyen por mocks para no tocar localStorage ni la red.
const hoisted = vi.hoisted(() => ({ authState: { token: null as string | null, user: null as unknown } }));

vi.mock('../../../src/store/authStore', () => ({
  selectIsAuthenticated: (s: { token: string | null; user: unknown }) => s.token !== null && s.user !== null,
  useAuthStore: { getState: () => hoisted.authState },
}));

vi.mock('../../../src/repositories/historyRepository', () => ({
  historyRepository: {
    create: vi.fn(),
  },
}));

describe('historyStore', () => {
  beforeEach(() => {
    hoisted.authState = { token: null, user: null };
    vi.mocked(historyRepository.create).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('añade una entrada local optimista sin sincronizar', async () => {
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'Tirada de dados',
      record: { module: 'dice', description: 'Tirada de dados', metadata: { sides: 6 } },
    });

    const entries = useHistoryStore.getState().entries as Array<{ id: string; synced: boolean }>;
    expect(entries).toHaveLength(1);
    expect(entries[0].synced).toBe(false);
    expect(entries[0].module).toBe('dice');
    expect(entries[0].id).toMatch(/^local-/);
    // No autenticado: no se llama a la API.
    expect(historyRepository.create).not.toHaveBeenCalled();
  });

  it('sincroniza contra el backend cuando hay sesión', async () => {
    hoisted.authState = { token: 't', user: { id: 'u1' } };
    vi.mocked(historyRepository.create).mockResolvedValue({
      data: { id: 'backend-1', module: 'dice', description: 'Tirada de dados' },
    });

    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'Tirada de dados',
      record: { module: 'dice', description: 'Tirada de dados', metadata: { sides: 6 } },
    });

    const entries = useHistoryStore.getState().entries as Array<{ id: string; synced: boolean }>;
    expect(historyRepository.create).toHaveBeenCalledTimes(1);
    expect(entries[0].synced).toBe(true);
  });

  it('mantiene solo las MAX_ENTRIES más recientes', async () => {
    for (let i = 0; i < 25; i++) {
      await useHistoryStore.getState().add({
        module: 'numbers',
        description: `Entrada ${i}`,
        record: { module: 'numbers', description: `Entrada ${i}`, metadata: {} },
      });
    }
    const entries = useHistoryStore.getState().entries as Array<{ id: string }>;
    expect(entries).toHaveLength(20);
    // La primera es la más reciente (la última añadida).
    expect(entries[0].id).toMatch(/^local-/);
  });

  it('degrada gracefulmente ante un error de sincronización', async () => {
    hoisted.authState = { token: 't', user: { id: 'u1' } };
    vi.mocked(historyRepository.create).mockRejectedValue(new ApiError(500, 'Server error'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await useHistoryStore.getState().add({
      module: 'teams',
      description: 'Equipos',
      record: { module: 'teams', description: 'Equipos', metadata: {} },
    });

    const entries = useHistoryStore.getState().entries as Array<{ id: string; synced: boolean }>;
    expect(entries[0].synced).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('limpia todas las entradas', async () => {
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'a',
      record: { module: 'dice', description: 'a', metadata: {} },
    });
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'b',
      record: { module: 'dice', description: 'b', metadata: {} },
    });
    useHistoryStore.getState().clear();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  describe('selectRecentEntries', () => {
    it('devuelve las entradas ordenadas de la más reciente', async () => {
      await useHistoryStore.getState().add({
        module: 'dice',
        description: 'primera',
        record: { module: 'dice', description: 'primera', metadata: {} },
      });
      await useHistoryStore.getState().add({
        module: 'numbers',
        description: 'segunda',
        record: { module: 'numbers', description: 'segunda', metadata: {} },
      });

      const recent = selectRecentEntries(useHistoryStore.getState());
      expect(recent).toHaveLength(2);
      expect(recent[0].description).toBe('segunda');
    });
  });
});
