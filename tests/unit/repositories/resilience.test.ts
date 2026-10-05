// Pruebas de resiliencia y degradación agraciada (plan sección 5).
// Entorno `node`: se mockea `fetch` y el localStorage; no se renderiza DOM.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bindAuthStoreToHttpClient, useAuthStore } from '../../../src/store/authStore';
import { useHistoryStore } from '../../../src/store/historyStore';
import { ApiError, type CreateHistoryPayload } from '../../../src/domain/types';
import { http, request, setTokenProvider } from '../../../src/repositories/httpClient';
import { installLocalStorage } from '../helpers/localStorageMock';

const STORAGE_KEY = 'thrive_auth_v1';

const AUTH_RECORD: CreateHistoryPayload = {
  module_name: 'dice',
  action: 'd20',
  payload: { sides: 20, modifier: 0 },
  result: { rolls: [15], modifier: 0, total: 15 },
};

/** Mock de respuesta fetch. `json` por defecto devuelve `data`. */
function fetchResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function authenticate() {
  useAuthStore.setState({
    user: { id: 7, name: 'Ada', email: 'ada@example.com' },
    token: 'session-token',
    expiresAt: null,
    status: 'idle',
    error: null,
  });
  bindAuthStoreToHttpClient();
}

describe('resiliencia — degradación agraciada del historial', () => {
  beforeEach(() => {
    installLocalStorage();
    useHistoryStore.setState({ entries: [] });
    useAuthStore.setState({
      user: null,
      token: null,
      expiresAt: null,
      status: 'idle',
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    setTokenProvider(() => null);
  });

  it('mantiene el sorteo local (synced=false) cuando el backend responde 500', async () => {
    authenticate();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fetchResponse({ message: 'Internal Server Error' }, 500)),
    );

    await expect(useHistoryStore.getState().add({ module: 'dice', description: 'd20 = 15', record: AUTH_RECORD })).resolves.toBeUndefined();

    const entries = useHistoryStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].module).toBe('dice');
    expect(entries[0].description).toBe('d20 = 15');
    // Indicador "solo local": nunca se marcó como sincronizada.
    expect(entries[0].synced).toBe(false);
  });

  it.each([500, 502, 503])('degrada agraciada ante un %i del backend', async (status) => {
    authenticate();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fetchResponse({ message: 'Bad Gateway' }, status)),
    );

    await useHistoryStore.getState().add({ module: 'roulette', description: 'Ganador: Sí', record: AUTH_RECORD });

    const entries = useHistoryStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].synced).toBe(false);
  });

  it('registra un 401 repentino en consola sin bloquear el flujo', async () => {
    authenticate();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fetchResponse({ message: 'Token expirado' }, 401)),
    );

    // El sorteo no se bloquea: la entrada queda local pese al 401.
    await useHistoryStore.getState().add({ module: 'dice', description: 'd20 = 7', record: AUTH_RECORD });

    expect(useHistoryStore.getState().entries[0].synced).toBe(false);
    expect(warn).toHaveBeenCalled();
    const logged = warn.mock.calls.map((c) => String(c[0])).join(' ');
    expect(logged).toContain('401');
  });

  it('no requiere sesión: sin token no hace petición al backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fetchResponse({}, 200));
    vi.stubGlobal('fetch', fetchMock);

    await useHistoryStore.getState().add({ module: 'dice', description: 'd20 = 3', record: AUTH_RECORD });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useHistoryStore.getState().entries[0].synced).toBe(false);
  });
});

describe('resiliencia — localStorage corrupta', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    setTokenProvider(() => null);
  });

  it('arranca anónimo cuando la clave de auth contiene JSON inválido', async () => {
    installLocalStorage();
    localStorage.setItem(STORAGE_KEY, '{ "token": "abc", "user": { id: 1 }'); // JSON inválido

    vi.resetModules();
    // Re-import: authStore ejecuta loadPersisted() al inicializar el singleton.
    const { useAuthStore: freshAuth } = await import('../../../src/store/authStore');

    expect(freshAuth.getState().user).toBeNull();
    expect(freshAuth.getState().token).toBeNull();
    expect(freshAuth.getState().status).toBe('idle');
  });

  it('arranca anónimo cuando el auth guardado no trae token ni usuario', async () => {
    installLocalStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));

    vi.resetModules();
    const { useAuthStore: freshAuth } = await import('../../../src/store/authStore');

    expect(freshAuth.getState().user).toBeNull();
    expect(freshAuth.getState().token).toBeNull();
  });
});

describe('resiliencia — errores sin JSON del backend', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    setTokenProvider(() => null);
  });

  it('normaliza una respuesta HTML plano (proxy/Nginx) a un ApiError con código numérico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        // Cuerpo HTML plano: json() lanza en vez de devolver JSON.
        json: async () => {
          throw new Error('Invalid JSON');
        },
      }),
    );

    const err = await request('/me').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe('Error 500');
  });

  it('mantiene el código numérico aunque el mensaje no sea parseable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('no json');
        },
      }),
    );

    const err = await request('/me').catch((e) => e);
    expect(err.status).toBe(502);
  });
});
