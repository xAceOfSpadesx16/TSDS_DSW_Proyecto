import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../src/domain/types';
import { installLocalStorage } from '../helpers/localStorageMock';

const STORAGE_KEY = 'thrive_auth_v1';

// El store importa authRepository; lo sustituimos por un mock para no tocar la red.
vi.mock('../../../src/repositories/authRepository', () => ({
  authRepository: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    refresh: vi.fn(),
  },
}));

// Importa todo desde el mismo registro fresco (tras resetModules) para que
// ApiError y httpClient compartan la misma instancia que el store.
async function freshDeps() {
  const storeMod = await import('../../../src/store/authStore');
  const repoMod = await import('../../../src/repositories/authRepository');
  const domainMod = await import('../../../src/domain/types');
  const httpMod = await import('../../../src/repositories/httpClient');
  return {
    store: storeMod.useAuthStore,
    bindAuth: storeMod.bindAuthStoreToHttpClient,
    selectIsAuthenticated: storeMod.selectIsAuthenticated,
    repo: repoMod.authRepository,
    domain: domainMod,
    http: httpMod.http,
    setToken: httpMod.setTokenProvider,
  };
}

describe('authStore', () => {
  beforeEach(() => {
    installLocalStorage();
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  describe('estado inicial', () => {
    it('empieza limpio cuando no hay nada persistido', async () => {
      const { store } = await freshDeps();
      const state = store.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.status).toBe('idle');
    });

    it('ignora un localStorage corrupto sin lanzar', async () => {
      localStorage.setItem(STORAGE_KEY, '{no-es-json');
      const { store } = await freshDeps();
      const state = store.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('ignora un persistido válido solo en parte (sin token)', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: { id: 'u1' } }));
      const { store } = await freshDeps();
      const state = store.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('ignora un token vacío', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: { id: 'u1' }, token: '', expires_at: null }),
      );
      const { store } = await freshDeps();
      expect(store.getState().user).toBeNull();
      expect(store.getState().token).toBeNull();
    });

    it('hidrata el usuario desde un localStorage válido', async () => {
      const persisted = {
        user: { id: 'u1', name: 'Ada', email: 'ada@example.com' },
        token: 'persisted-token',
        expires_at: Date.now() + 3600_000,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      const { store } = await freshDeps();
      const state = store.getState();
      expect(state.user).toMatchObject({ id: 'u1' });
      expect(state.token).toBe('persisted-token');
    });
  });

  describe('login', () => {
    it('guarda el usuario, el token y persiste al éxito', async () => {
      const { repo, store } = await freshDeps();
      vi.mocked(repo.login).mockResolvedValue({
        user: { id: 1, name: 'Ada', email: 'ada@example.com' },
        token: 'new-token',
        token_type: 'bearer',
        expires_in: 3600,
      });

      await store.getState().login({ email: 'ada@example.com', password: 's3cret' });
      const state = store.getState();

      expect(state.user).toMatchObject({ id: 1 });
      expect(state.token).toBe('new-token');
      expect(state.status).toBe('idle');
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string).token).toBe('new-token');
    });

    it('calcula expiresAt a partir de expires_in', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const { repo, store } = await freshDeps();
      vi.mocked(repo.login).mockResolvedValue({
        user: { id: 1, name: 'Ada', email: 'ada@example.com' },
        token: 't',
        token_type: 'bearer',
        expires_in: 3600,
      });

      await store.getState().login({ email: 'a', password: 'b' });
      expect(store.getState().expiresAt).toBe(1_000_000 + 3600_000);
    });

    it('marca estado de error y no persiste ante una ApiError', async () => {
      const { repo, store, domain } = await freshDeps();
      vi.mocked(repo.login).mockRejectedValue(
        new domain.ApiError(401, { message: 'Invalid credentials' }),
      );

      await expect(
        store.getState().login({ email: 'a', password: 'b' }),
      ).rejects.toBeInstanceOf(domain.ApiError);

      const state = store.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Invalid credentials');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('marca error con mensaje genérico ante un error no ApiError', async () => {
      const { repo, store } = await freshDeps();
      vi.mocked(repo.login).mockRejectedValue(new Error('Sin conexión'));

      await expect(
        store.getState().login({ email: 'a', password: 'b' }),
      ).rejects.toBeInstanceOf(Error);

      const state = store.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('No se pudo iniciar sesión.');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('register', () => {
    it('guarda la sesión tras un registro exitoso', async () => {
      const { repo, store } = await freshDeps();
      vi.mocked(repo.register).mockResolvedValue({
        user: { id: 2, name: 'Grace', email: 'grace@example.com' },
        token: 'reg-token',
        token_type: 'bearer',
        expires_in: 1800,
      });

      await store.getState().register({ name: 'Grace', email: 'grace@example.com', password: 's3cret' });
      const state = store.getState();
      expect(state.user).toMatchObject({ id: 2 });
      expect(state.token).toBe('reg-token');
    });

    it('marca error y no persiste ante una ApiError en register', async () => {
      const { repo, store, domain } = await freshDeps();
      vi.mocked(repo.register).mockRejectedValue(
        new domain.ApiError(409, { message: 'El usuario ya existe' }),
      );

      await expect(
        store.getState().register({ name: 'X', email: 'x', password: 'y' }),
      ).rejects.toBeInstanceOf(domain.ApiError);

      const state = store.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('El usuario ya existe');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('marca error con mensaje genérico ante un error no ApiError', async () => {
      const { repo, store } = await freshDeps();
      vi.mocked(repo.register).mockRejectedValue(new Error('Sin conexión'));

      await expect(
        store.getState().register({ name: 'X', email: 'x', password: 'y' }),
      ).rejects.toBeInstanceOf(Error);

      const state = store.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('No se pudo completar el registro.');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('hydrate', () => {
    it('es un hook no-op que no lanza', async () => {
      const { store } = await freshDeps();
      expect(() => store.getState().hydrate()).not.toThrow();
    });

    it('con el token vencido intenta refresh antes de cerrar la sesión', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: { id: 1, name: 'Ada', email: 'ada@example.com' },
          token: 'vencido',
          expires_at: Date.now() - 1000,
        }),
      );
      const { repo, store } = await freshDeps();
      vi.mocked(repo.refresh).mockResolvedValue({
        user: { id: 1, name: 'Ada', email: 'ada@example.com' },
        token: 'renovado',
        token_type: 'bearer',
        expires_in: 3600,
      });

      await store.getState().hydrate();

      expect(repo.refresh).toHaveBeenCalledTimes(1);
      const state = store.getState();
      expect(state.token).toBe('renovado');
      expect(state.expiresAt).toBeGreaterThan(Date.now());
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string).token).toBe('renovado');
    });

    it('si el refresh del token vencido falla, cierra la sesión', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: { id: 1, name: 'Ada', email: 'ada@example.com' },
          token: 'vencido',
          expires_at: Date.now() - 1000,
        }),
      );
      const { repo, store } = await freshDeps();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(repo.refresh).mockRejectedValue(new Error('Failed to fetch'));

      await store.getState().hydrate();

      const state = store.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('logout', () => {
    it('borra el estado y la persistencia al éxito', async () => {
      const { repo, store } = await freshDeps();
      // `logout` responde 200 con un mensaje; el store lo ignora.
      vi.mocked(repo.logout).mockResolvedValue({ message: 'Sesión cerrada correctamente.' });

      await store.getState().logout();
      const state = store.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('es best-effort: borra el estado aunque el logout remoto falle', async () => {
      const { repo, store } = await freshDeps();
      vi.mocked(repo.logout).mockRejectedValue(new ApiError(500, { message: 'Server error' }));

      await expect(store.getState().logout()).resolves.toBeUndefined();
      const state = store.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });
  });

  describe('selectIsAuthenticated', () => {
    it('es true solo con token y usuario', async () => {
      const { store, selectIsAuthenticated, repo } = await freshDeps();
      expect(selectIsAuthenticated(store.getState())).toBe(false);

      vi.mocked(repo.login).mockResolvedValue({
        user: { id: 1, name: 'Ada', email: 'a' },
        token: 't',
        token_type: 'bearer',
        expires_in: 3600,
      });
      await store.getState().login({ email: 'a', password: 'b' });
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });
  });

  describe('bindAuthStoreToHttpClient', () => {
    it('un refresh fallido no borra el token que otra pestaña renovó', async () => {
      const user = { id: 1, name: 'Ada', email: 'ada@example.com' };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user, token: 'viejo', expires_at: Date.now() + 3600_000 }),
      );
      const { repo, store, bindAuth, http } = await freshDeps();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Otra pestaña renueva mientras este tab está pidiendo el refresh, y
      // el refresh de este tab falla.
      vi.mocked(repo.refresh).mockImplementation(async () => {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user, token: 'otra-pestana', expires_at: Date.now() + 3600_000 }),
        );
        throw new Error('Failed to fetch');
      });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Token expirado' }),
        }),
      );

      bindAuth();
      await expect(http.get('/me')).rejects.toMatchObject({ status: 401 });

      // La persistencia de la otra pestaña sobrevive y se adopta en memoria.
      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(persisted.token).toBe('otra-pestana');
      expect(store.getState().token).toBe('otra-pestana');
    });

    it('inyecta el token del store en las peticiones del httpClient', async () => {
      const { repo, store, bindAuth, http, setToken } = await freshDeps();
      vi.mocked(repo.login).mockResolvedValue({
        user: { id: 1, name: 'Ada', email: 'a' },
        token: 'bound-token',
        token_type: 'bearer',
        expires_in: 3600,
      });
      await store.getState().login({ email: 'a', password: 'b' });

      bindAuth();
      await http.get('/me');

      const calls = vi.mocked(global.fetch).mock.calls;
      const headers = (calls[calls.length - 1][1] as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer bound-token');
      // El proveedor quedó registrado en el httpClient.
      setToken(() => null);
    });
  });
});
