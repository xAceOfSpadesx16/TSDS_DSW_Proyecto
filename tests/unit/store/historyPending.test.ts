// Pruebas del reintento de sorteos pendientes (plan v3 fase 5).
//
// Cuando `add()` falla con sesión activa, la entrada queda pendiente con el
// id del usuario dueño. Al recuperar la sesión del mismo usuario se reenvía
// antes de `load()`; los pendientes de otra cuenta se descartan.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  retryPendingDraws,
  useHistoryStore,
  type LocalHistoryEntry,
} from '../../../src/store/historyStore';
import { useAuthStore } from '../../../src/store/authStore';
import { historyRepository } from '../../../src/repositories/historyRepository';
import { loadPendingDraws } from '../../../src/lib/storage';
import {
  ApiError,
  type CreateHistoryPayload,
  type HistoryRecord,
} from '../../../src/domain/types';
import { installLocalStorage } from '../helpers/localStorageMock';

vi.mock('../../../src/repositories/historyRepository', () => ({
  historyRepository: {
    create: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    clearAll: vi.fn(),
  },
}));

const RECORD: CreateHistoryPayload = {
  module_name: 'dice',
  action: 'd20',
  payload: { sides: 20, modifier: 0 },
  result: { rolls: [15], modifier: 0, total: 15 },
};

/** Entrada pendiente de un sorteo que falló al guardarse. */
function pendingEntry(id: string, userId: number, record = RECORD): LocalHistoryEntry {
  return {
    id,
    module: 'dice',
    description: record.action,
    timestamp: '2026-10-05T00:00:00.000Z',
    synced: false,
    pending: { record, userId },
  };
}

/** Respuesta vacía de `GET /api/histories`. */
function emptyList() {
  return {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
  };
}

/** Respuesta de `POST /api/history` para un guardado exitoso. */
function savedRecord(action = 'd20'): { data: HistoryRecord } {
  return {
    data: {
      id: 'srv-1',
      user_id: 7,
      module_name: 'dice',
      action,
      payload: { sides: 20, modifier: 0 },
      result: { rolls: [15], modifier: 0, total: 15 },
      created_at: '2026-10-05T00:00:00.000Z',
      updated_at: '2026-10-05T00:00:00.000Z',
    },
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

describe('historyStore — sorteos pendientes', () => {
  beforeEach(() => {
    installLocalStorage();
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    useHistoryStore.setState({ entries: [], currentPage: 1, lastPage: 1, loading: false, error: null });
    vi.mocked(historyRepository.create).mockReset();
    vi.mocked(historyRepository.list).mockReset();
    vi.mocked(historyRepository.list).mockResolvedValue(emptyList());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('add() fallido con sesión deja la entrada pendiente con el id del usuario', async () => {
    authenticate(7);
    vi.mocked(historyRepository.create).mockRejectedValue(
      new ApiError(500, { message: 'Server error' }),
    );

    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd20 = 15',
      record: RECORD,
    });

    const [entry] = useHistoryStore.getState().entries;
    expect(entry.pending).toEqual({ record: RECORD, userId: 7 });
    expect(entry.synced).toBe(false);
  });

  it('un pendiente persiste por usuario y se reintenta al recargar', async () => {
    authenticate(7);
    vi.mocked(historyRepository.create).mockRejectedValueOnce(
      new ApiError(500, { message: 'Server error' }),
    );

    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd20 = 15',
      record: RECORD,
    });

    expect(loadPendingDraws(7)).toHaveLength(1);
    // Simula una recarga: la lista en memoria se vacía, pero el pendiente
    // sigue guardado en localStorage.
    useHistoryStore.setState({ entries: [] });
    vi.mocked(historyRepository.create).mockResolvedValue(savedRecord());

    await useHistoryStore.getState().load();

    expect(historyRepository.create).toHaveBeenCalledWith(RECORD);
    expect(loadPendingDraws(7)).toHaveLength(0);
  });

  it('add() fallido sin sesión NO deja pendiente (entradas de invitado)', async () => {
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    vi.mocked(historyRepository.create).mockRejectedValue(new Error('Failed to fetch'));

    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'd20 = 15',
      record: RECORD,
    });

    const [entry] = useHistoryStore.getState().entries;
    expect(entry.pending).toBeUndefined();
    // Sin sesión el backend ni se consulta.
    expect(historyRepository.create).not.toHaveBeenCalled();
  });

  it('un pendiente del mismo usuario se guarda al recuperar su sesión', async () => {
    authenticate(7);
    vi.mocked(historyRepository.create).mockResolvedValue({
      data: {
        id: 'srv-1',
        user_id: 7,
        module_name: 'dice',
        action: 'd20',
        payload: { sides: 20, modifier: 0 },
        result: { rolls: [15], modifier: 0, total: 15 },
        created_at: '2026-10-05T00:00:00.000Z',
        updated_at: '2026-10-05T00:00:00.000Z',
      },
    });
    useHistoryStore.setState({ entries: [pendingEntry('p1', 7)] });

    await useHistoryStore.getState().load();

    expect(historyRepository.create).toHaveBeenCalledWith(RECORD);
    // El `load()` reemplaza la lista por la del servidor, así que la entrada
    // local ya no está: el sorteo se recuperó del backend.
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('tras el reintento exitoso la entrada deja de estar pendiente', async () => {
    authenticate(7);
    vi.mocked(historyRepository.create).mockResolvedValue({
      data: {
        id: 'srv-1',
        user_id: 7,
        module_name: 'dice',
        action: 'd20',
        payload: { sides: 20, modifier: 0 },
        result: { rolls: [15], modifier: 0, total: 15 },
        created_at: '2026-10-05T00:00:00.000Z',
        updated_at: '2026-10-05T00:00:00.000Z',
      },
    });
    // El servidor ahora devuelve el registro (ya fue guardado).
    vi.mocked(historyRepository.list).mockResolvedValue({
      data: [
        {
          id: 'srv-1',
          user_id: 7,
          module_name: 'dice',
          action: 'd20',
          payload: { sides: 20, modifier: 0 },
          result: { rolls: [15], modifier: 0, total: 15 },
          created_at: '2026-10-05T00:00:00.000Z',
          updated_at: '2026-10-05T00:00:00.000Z',
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
    });
    useHistoryStore.setState({ entries: [pendingEntry('p1', 7)] });

    await useHistoryStore.getState().load();

    const entries = useHistoryStore.getState().entries;
    expect(entries).toHaveLength(1);
    // Ahora viene del servidor: sincronizada y sin pendiente.
    expect(entries[0].id).toBe('srv-1');
    expect(entries[0].pending).toBeUndefined();
    expect(entries[0].synced).toBe(true);
  });

  it('los pendientes de otro usuario se descartan y no se envían', async () => {
    authenticate(7);
    vi.mocked(historyRepository.create).mockResolvedValue({
      data: {
        id: 'srv-1',
        user_id: 7,
        module_name: 'dice',
        action: 'd20',
        payload: { sides: 20, modifier: 0 },
        result: { rolls: [15], modifier: 0, total: 15 },
        created_at: '2026-10-05T00:00:00.000Z',
        updated_at: '2026-10-05T00:00:00.000Z',
      },
    });
    // Un pendiente de la cuenta 99, y entramos como 7.
    useHistoryStore.setState({ entries: [pendingEntry('ajeno', 99)] });

    await useHistoryStore.getState().load();

    // Nunca se envió con la cuenta ajena.
    expect(historyRepository.create).not.toHaveBeenCalled();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('el reintento va antes del load y en orden', async () => {
    authenticate(7);
    const order: string[] = [];
    vi.mocked(historyRepository.create).mockImplementation(async () => {
      order.push('create');
      return {
        data: {
          id: 'srv',
          user_id: 7,
          module_name: 'dice',
          action: 'd20',
          payload: { sides: 20, modifier: 0 },
          result: { rolls: [15], modifier: 0, total: 15 },
          created_at: '2026-10-05T00:00:00.000Z',
          updated_at: '2026-10-05T00:00:00.000Z',
        },
      };
    });
    vi.mocked(historyRepository.list).mockImplementation(async () => {
      order.push('list');
      return emptyList();
    });

    const r2: CreateHistoryPayload = {
      module_name: 'dice',
      action: 'd6',
      payload: { sides: 6, modifier: 0 },
      result: { rolls: [4], modifier: 0, total: 4 },
    };
    useHistoryStore.setState({
      entries: [pendingEntry('primero', 7), pendingEntry('segundo', 7, r2)],
    });

    await useHistoryStore.getState().load();

    expect(order).toEqual(['create', 'create', 'list']);
    expect(vi.mocked(historyRepository.create).mock.calls.map((c) => (c[0] as CreateHistoryPayload).action)).toEqual([
      'd20',
      'd6',
    ]);
  });

  it('un pendiente que vuelve a fallar sigue visible después del load()', async () => {
    authenticate(7);
    vi.mocked(historyRepository.create).mockRejectedValue(
      new ApiError(500, { message: 'Server error' }),
    );
    // El list devuelve un registro del servidor.
    vi.mocked(historyRepository.list).mockResolvedValue({
      data: [
        {
          id: 'srv-1',
          user_id: 7,
          module_name: 'dice',
          action: 'd6',
          payload: { sides: 6, modifier: 0 },
          result: { rolls: [4], modifier: 0, total: 4 },
          created_at: '2026-10-05T00:00:00.000Z',
          updated_at: '2026-10-05T00:00:00.000Z',
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
    });
    useHistoryStore.setState({ entries: [pendingEntry('p1', 7)] });

    await useHistoryStore.getState().load();

    const entries = useHistoryStore.getState().entries;
    expect(entries).toHaveLength(2);
    // El pendiente sigue primero y conserva su marca.
    expect(entries[0].id).toBe('p1');
    expect(entries[0].pending).toEqual({ record: RECORD, userId: 7 });
    // Y el del servidor está detrás.
    expect(entries[1].id).toBe('srv-1');
  });

  it('borrar un pendiente no toca el backend', async () => {
    authenticate(7);
    useHistoryStore.setState({ entries: [pendingEntry('p1', 7)] });

    await useHistoryStore.getState().remove('p1');

    expect(historyRepository.remove).not.toHaveBeenCalled();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('un pendiente se reenvía después de un guardado exitoso', async () => {
    authenticate(7);
    vi.mocked(historyRepository.create).mockResolvedValue(savedRecord());
    useHistoryStore.setState({ entries: [pendingEntry('p1', 7)] });

    const nuevo: CreateHistoryPayload = {
      module_name: 'dice',
      action: 'nuevo',
      payload: { sides: 6, modifier: 0 },
      result: { rolls: [4], modifier: 0, total: 4 },
    };
    await useHistoryStore.getState().add({
      module: 'dice',
      description: 'nuevo',
      record: nuevo,
    });

    // Primero el sorteo recién creado; después el pendiente anterior.
    expect(
      vi.mocked(historyRepository.create).mock.calls.map(
        (c) => (c[0] as CreateHistoryPayload).action,
      ),
    ).toEqual(['nuevo', 'd20']);

    const entries = useHistoryStore.getState().entries;
    const pendiente = entries.find((e) => e.id === 'p1');
    expect(pendiente?.pending).toBeUndefined();
    expect(pendiente?.synced).toBe(true);
  });

  it('nunca corre dos reintentos de pendientes en simultáneo', async () => {
    authenticate(7);
    let release!: () => void;
    vi.mocked(historyRepository.create).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(savedRecord());
        }),
    );
    useHistoryStore.setState({ entries: [pendingEntry('p1', 7)] });

    // Los dos disparadores llegan antes de que el primero termine.
    const first = retryPendingDraws();
    const second = retryPendingDraws();

    expect(historyRepository.create).toHaveBeenCalledTimes(1);

    release();
    await Promise.all([first, second]);

    // El segundo se sumó al reintento en vuelo, no mandó otra petición.
    expect(historyRepository.create).toHaveBeenCalledTimes(1);
  });

  it('no repuebla la lista si la sesión se cierra durante load()', async () => {
    authenticate(7);
    let resolveList!: (value: {
      data: HistoryRecord[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }) => void;
    vi.mocked(historyRepository.list).mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    const loading = useHistoryStore.getState().load();
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    resolveList({
      data: [savedRecord().data],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
    });
    await loading;

    expect(useHistoryStore.getState().entries).toEqual([]);
    expect(useHistoryStore.getState().loading).toBe(false);
  });

  it('no repuebla la lista si la sesión se cierra durante loadMore()', async () => {
    authenticate(7);
    useHistoryStore.setState({ entries: [], currentPage: 1, lastPage: 2 });
    let resolveList!: (value: {
      data: HistoryRecord[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }) => void;
    vi.mocked(historyRepository.list).mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    const loading = useHistoryStore.getState().loadMore();
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    resolveList({
      data: [savedRecord().data],
      meta: { current_page: 2, last_page: 2, per_page: 20, total: 1 },
    });
    await loading;

    expect(useHistoryStore.getState().entries).toEqual([]);
    expect(useHistoryStore.getState().loading).toBe(false);
  });

  it('sin sesión, load() no reintenta nada', async () => {
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    useHistoryStore.setState({ entries: [pendingEntry('p1', 7)] });

    await useHistoryStore.getState().load();

    expect(historyRepository.create).not.toHaveBeenCalled();
    expect(historyRepository.list).not.toHaveBeenCalled();
  });

  it('la carga no borra pendientes de invitado que no tienen userId', async () => {
    authenticate(7);
    // Entrada de invitado: sin `pending`, solo local.
    useHistoryStore.setState({
      entries: [
        {
          id: 'local-1',
          module: 'dice',
          description: 'd20 = 7',
          timestamp: '2026-10-05T00:00:00.000Z',
          synced: false,
        },
      ],
    });
    vi.mocked(historyRepository.list).mockResolvedValue(emptyList());

    await useHistoryStore.getState().load();

    // No se envía (nunca fue un pendiente) y no sobrevive al load().
    expect(historyRepository.create).not.toHaveBeenCalled();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });
});
