// @vitest-environment jsdom
// =============================================================================
// historyStore — persistencia del historial de invitado y su importación.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHistoryStore } from '../../../src/store/historyStore';
import { useAuthStore } from '../../../src/store/authStore';
import { historyRepository } from '../../../src/repositories/historyRepository';
import { loadGuestHistory } from '../../../src/lib/storage';
import { ApiError, type CreateHistoryPayload } from '../../../src/domain/types';
import { installLocalStorage } from '../helpers/localStorageMock';

vi.mock('../../../src/repositories/historyRepository', () => ({
  historyRepository: {
    create: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    clearAll: vi.fn(),
  },
}));

function record(action: string, sides = 20): CreateHistoryPayload {
  return {
    module_name: 'dice',
    action,
    payload: { sides, modifier: 0 },
    result: { rolls: [4], modifier: 0, total: 4 },
  };
}

function authenticate(userId: number): void {
  useAuthStore.setState({
    user: { id: userId, name: 'Ada', email: `u${userId}@example.com` },
    token: 'jwt',
    expiresAt: null,
    status: 'idle',
    error: null,
  });
}

function emptyList() {
  return {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
  };
}

describe('historyStore — historial de invitado', () => {
  beforeEach(() => {
    installLocalStorage();
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    useHistoryStore.setState({
      entries: [],
      guestEntries: [],
      guestImportPending: false,
      guestImportError: null,
      currentPage: 1,
      lastPage: 1,
      loading: false,
      error: null,
    });
    vi.mocked(historyRepository.create).mockReset();
    vi.mocked(historyRepository.list).mockReset();
    vi.mocked(historyRepository.list).mockResolvedValue(emptyList());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persiste un sorteo anónimo y lo restaura al cargar el invitado', async () => {
    const payload = record('d20');
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd20 = 7',
      record: payload,
    });

    expect(loadGuestHistory()).toHaveLength(1);
    expect(loadGuestHistory()[0].record).toEqual(payload);

    // Simula recarga: se vacía la memoria y se vuelve a cargar el invitado.
    useHistoryStore.setState({ entries: [], guestEntries: [] });
    useHistoryStore.getState().loadGuest();

    const entries = useHistoryStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].description).toBe('d20 = 7');
    expect(entries[0].record).toEqual(payload);
  });

  it('elimina del almacenamiento una entrada anónima borrada', async () => {
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd20 = 7',
      record: record('d20'),
    });
    const id = useHistoryStore.getState().entries[0].id;

    await useHistoryStore.getState().remove(id);

    expect(useHistoryStore.getState().entries).toEqual([]);
    expect(loadGuestHistory()).toEqual([]);
  });

  it('importa el historial de invitado en orden cronológico y lo vacía', async () => {
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd20 = 7',
      record: record('d20'),
    });
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd6 = 4',
      record: record('d6', 6),
    });
    authenticate(7);
    vi.mocked(historyRepository.create).mockResolvedValue({
      data: {
        id: 'srv',
        user_id: 7,
        module_name: 'dice',
        action: 'd20',
        payload: { sides: 20, modifier: 0 },
        result: { rolls: [7], modifier: 0, total: 7 },
        created_at: '2026-10-20T12:00:00.000Z',
        updated_at: '2026-10-20T12:00:00.000Z',
      },
    });

    await useHistoryStore.getState().importGuestHistory();

    expect(
      vi.mocked(historyRepository.create).mock.calls.map(
        (call) => (call[0] as CreateHistoryPayload).action,
      ),
    ).toEqual(['d20', 'd6']);
    expect(loadGuestHistory()).toEqual([]);
    expect(useHistoryStore.getState().guestEntries).toEqual([]);
    expect(useHistoryStore.getState().guestImportPending).toBe(false);
  });

  it('si una importación falla, conserva lo no importado y deja el error', async () => {
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd20 = 7',
      record: record('d20'),
    });
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd6 = 4',
      record: record('d6', 6),
    });
    authenticate(7);
    useHistoryStore.getState().requestGuestImport();
    vi.mocked(historyRepository.create).mockRejectedValue(
      new ApiError(500, { message: 'Server error' }),
    );

    await expect(
      useHistoryStore.getState().importGuestHistory(),
    ).rejects.toThrow();

    expect(loadGuestHistory()).toHaveLength(2);
    expect(useHistoryStore.getState().guestImportError).toMatch(
      /No se pudieron importar 2 sorteos/,
    );
    expect(useHistoryStore.getState().guestImportPending).toBe(true);
  });

  it('si falla una importación intermedia, conserva la fallida y las posteriores', async () => {
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'primero',
      record: record('primero'),
    });
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'segundo',
      record: record('segundo'),
    });
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'tercero',
      record: record('tercero'),
    });
    authenticate(7);
    useHistoryStore.getState().requestGuestImport();
    vi.mocked(historyRepository.create)
      .mockResolvedValueOnce({
        data: {
          id: 'srv-1',
          user_id: 7,
          module_name: 'dice',
          action: 'primero',
          payload: { sides: 20, modifier: 0 },
          result: { rolls: [7], modifier: 0, total: 7 },
          created_at: '2026-10-20T12:00:00.000Z',
          updated_at: '2026-10-20T12:00:00.000Z',
        },
      })
      .mockRejectedValueOnce(new ApiError(500, { message: 'Server error' }));

    await expect(
      useHistoryStore.getState().importGuestHistory(),
    ).rejects.toThrow();

    expect(
      vi.mocked(historyRepository.create).mock.calls.map(
        (call) => (call[0] as CreateHistoryPayload).action,
      ),
    ).toEqual(['primero', 'segundo']);
    expect(
      loadGuestHistory().map((entry) => entry.description),
    ).toEqual(['tercero', 'segundo']);
    expect(useHistoryStore.getState().guestImportError).toMatch(
      /No se pudieron importar 2 sorteos/,
    );
  });

  it('loadGuest vuelve a mostrar el historial guardado tras una sesión', async () => {
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd20 = 7',
      record: record('d20'),
    });
    authenticate(7);
    useHistoryStore.setState({ entries: [] });

    useHistoryStore.getState().loadGuest();

    expect(useHistoryStore.getState().entries).toHaveLength(1);
    expect(useHistoryStore.getState().entries[0].module).toBe('dice');
  });
});
