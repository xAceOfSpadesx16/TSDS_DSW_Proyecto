// Pruebas del refresh de token en el cliente HTTP.
// Entorno `node`: se mockea `fetch`; no se renderiza DOM.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../src/domain/types';
import { authRepository } from '../../../src/repositories/authRepository';
import { historyRepository } from '../../../src/repositories/historyRepository';
import {
  request,
  setAdoptedTokenHandler,
  setStoredTokenReader,
  setTokenProvider,
  setTokenRefresher,
  setUnauthorizedHandler,
} from '../../../src/repositories/httpClient';
import { errorResponse, jsonResponse, unparsableErrorResponse } from '../helpers/fetchMock';

const STALE = 'token-vencido';
const FRESH = 'token-nuevo';

/**
 * `fetch` que responde 401 a las peticiones con el token viejo y 200 a
 * las que llevan el nuevo (y al propio refresh).
 */
function stubFetchSequence() {
  return vi.fn(async (_url: string, init: RequestInit | undefined) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const auth = headers['Authorization'] ?? '';

    if (auth === `Bearer ${STALE}`) {
      return errorResponse(401, { message: 'Token expirado' });
    }
    return jsonResponse({ data: { ok: true } }, 200);
  });
}

describe('refresh de token ante un 401', () => {
  beforeEach(() => {
    setTokenProvider(() => STALE);
    setTokenRefresher(async () => FRESH);
    // Si el refresh falla, la sesión se limpia: se espía para comprobarlo.
    setUnauthorizedHandler(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    setTokenProvider(() => null);
    setTokenRefresher(async () => null);
    setUnauthorizedHandler(() => {});
    setStoredTokenReader(() => null);
    setAdoptedTokenHandler(() => {});
  });

  it('renueva el token y repite la petición original, que responde bien', async () => {
    const fetchMock = stubFetchSequence();
    vi.stubGlobal('fetch', fetchMock);

    const res = await request<{ data: { ok: boolean } }>('/histories');

    expect(res).toEqual({ data: { ok: true } });
    // Dos llamadas: la original (401) y la repetida con el token nuevo.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const calls = fetchMock.mock.calls;
    const secondHeaders = (calls[1][1]?.headers ?? {}) as Record<string, string>;
    expect(secondHeaders['Authorization']).toBe(`Bearer ${FRESH}`);
  });

  it('adopta el token que otra pestaña persistió sin pedir un refresh', async () => {
    const refreshSpy = vi.fn(async () => FRESH);
    setTokenRefresher(refreshSpy);
    const adopted = vi.fn();
    setStoredTokenReader(() => FRESH);
    setAdoptedTokenHandler(adopted);

    const fetchMock = stubFetchSequence();
    vi.stubGlobal('fetch', fetchMock);

    const res = await request<{ data: { ok: boolean } }>('/histories');

    expect(res).toEqual({ data: { ok: true } });
    // La otra pestaña ya renovó: no se pide otro refresh.
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(adopted).toHaveBeenCalledWith(FRESH);

    // La petición original se repite directamente con el token persistido.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondHeaders = (fetchMock.mock.calls[1][1]?.headers ?? {}) as Record<string, string>;
    expect(secondHeaders['Authorization']).toBe(`Bearer ${FRESH}`);
  });

  it('un refresh fallido limpia la sesión y propaga el 401', async () => {
    setTokenRefresher(async () => null);
    const cleared = vi.fn();
    setUnauthorizedHandler(cleared);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(errorResponse(401, { message: 'Token expirado' })),
    );

    await expect(request('/histories')).rejects.toBeInstanceOf(ApiError);

    expect(cleared).toHaveBeenCalledTimes(1);
  });

  it('dos 401 simultáneos disparan un solo refresh', async () => {
    const refreshSpy = vi.fn(async () => FRESH);
    setTokenRefresher(refreshSpy);

    const fetchMock = stubFetchSequence();
    vi.stubGlobal('fetch', fetchMock);

    // Las dos peticiones arrancan antes de que ninguna termine.
    const [a, b] = await Promise.all([
      request<{ data: { ok: boolean } }>('/histories'),
      request<{ data: { ok: boolean } }>('/health/history'),
    ]);

    expect(a).toEqual({ data: { ok: true } });
    expect(b).toEqual({ data: { ok: true } });

    // Un único refresh para las dos, y una repetición por petición.
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('no reintenta si el token nuevo también da 401', async () => {
    setTokenRefresher(async () => FRESH);
    const cleared = vi.fn();
    setUnauthorizedHandler(cleared);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(errorResponse(401, { message: 'Token expirado' })),
    );

    await expect(request('/histories')).rejects.toBeInstanceOf(ApiError);

    // Original + una repetición. La repetición falla y no vuelve a iterar.
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2);
    expect(cleared).toHaveBeenCalledTimes(1);
  });
});

describe('refresh de token — rutas excluidas', () => {
  beforeEach(() => {
    setTokenProvider(() => STALE);
    setTokenRefresher(async () => FRESH);
    setUnauthorizedHandler(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    setTokenProvider(() => null);
    setTokenRefresher(async () => null);
    setUnauthorizedHandler(() => {});
    setStoredTokenReader(() => null);
    setAdoptedTokenHandler(() => {});
  });

  it.each([
    ['/auth/login', () => authRepository.login({ email: 'a@b.c', password: 'x' })],
    ['/auth/register', () => authRepository.register({ name: 'A', email: 'a@b.c', password: 'x' })],
  ])('no intenta refresh en %s', async (path, call) => {
    const refreshSpy = vi.fn(async () => FRESH);
    setTokenRefresher(refreshSpy);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(errorResponse(401, { message: 'Credenciales inválidas.' })),
    );

    await expect(call()).rejects.toBeInstanceOf(ApiError);

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    expect(path).toBeTruthy();
  });

  it('no intenta refresh dentro de /auth/refresh', async () => {
    const refreshSpy = vi.fn(async () => FRESH);
    setTokenRefresher(refreshSpy);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(errorResponse(401, { message: 'Token inválido o expirado.' })),
    );

    await expect(authRepository.refresh()).rejects.toBeInstanceOf(ApiError);

    // Si reintentara, entraría en recursión.
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
  });

  it('sin refresher registrado, el 401 se comporta como antes', async () => {
    // Sin `setTokenRefresher`, `refreshToken` devuelve null y no reintenta.
    setTokenRefresher(null as unknown as (t: string) => Promise<string | null>);
    const cleared = vi.fn();
    setUnauthorizedHandler(cleared);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(unparsableErrorResponse(401)),
    );

    await expect(historyRepository.list()).rejects.toBeInstanceOf(ApiError);

    expect(cleared).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
  });
});
