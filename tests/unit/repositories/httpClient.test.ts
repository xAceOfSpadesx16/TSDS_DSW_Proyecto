import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../src/domain/types';
import { http, httpBaseUrl, request, resolveBaseUrl, setTokenProvider } from '../../../src/repositories/httpClient';

type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(data: unknown, status = 200): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function errorResponse(status: number, body: unknown): FetchResponse {
  return { ok: false, status, json: async () => body };
}

function lastFetchUrl(): string {
  const calls = vi.mocked(global.fetch).mock.calls;
  return String(calls[calls.length - 1][0]);
}

function lastFetchInit(): RequestInit {
  const calls = vi.mocked(global.fetch).mock.calls;
  return (calls[calls.length - 1][1] ?? {}) as RequestInit;
}

describe('httpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 200)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    // Restablece el proveedor de token por defecto tras cada test.
    setTokenProvider(() => null);
  });

  describe('configuración de base URL', () => {
    it('expone la URL base por defecto', () => {
      expect(httpBaseUrl).toBe('http://127.0.0.1:8000/api');
    });

    it('usa el valor por defecto cuando la variable NO está definida', () => {
      vi.stubEnv('VITE_API_BASE_URL', undefined);
      expect(resolveBaseUrl()).toBe('http://127.0.0.1:8000/api');
    });

    it('une la base con la ruta añadiendo una sola barra inicial', async () => {
      await http.get('/foo');
      expect(lastFetchUrl()).toBe('http://127.0.0.1:8000/api/foo');
    });

    it('une la base con rutas sin barra inicial', async () => {
      await http.get('foo');
      expect(lastFetchUrl()).toBe('http://127.0.0.1:8000/api/foo');
    });

    it('normaliza barras finales redundantes en la URL base', () => {
      vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000/api///');
      expect(resolveBaseUrl()).toBe('http://127.0.0.1:8000/api');
    });

    it('usa VITE_API_BASE_URL cuando está presente', () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/api/');
      expect(resolveBaseUrl()).toBe('https://api.example.com/api');
    });
  });

  describe('parámetros de query', () => {
    it('incluye parámetros numéricos, booleanos y en string', async () => {
      await http.get('/search', { page: 2, per_page: 10, q: 'hola', active: true });
      const url = lastFetchUrl();
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=10');
      expect(url).toContain('q=hola');
      expect(url).toContain('active=true');
    });

    it('omite parámetros undefined, null y vacíos', async () => {
      await http.get('/search', {
        page: 1,
        empty: '',
        missing: undefined,
        nothing: null,
      } as Record<string, string | number | boolean | undefined>);
      const url = lastFetchUrl();
      expect(url).toContain('page=1');
      expect(url).not.toContain('empty');
      expect(url).not.toContain('missing');
      expect(url).not.toContain('nothing');
    });
  });

  describe('cabeceras', () => {
    it('envía siempre Accept: application/json', async () => {
      await http.get('/foo');
      expect(lastFetchInit().headers).toMatchObject({ Accept: 'application/json' });
    });

    it('añade Content-Type solo cuando hay body', async () => {
      await http.post('/foo', {});
      expect(lastFetchInit().headers).toMatchObject({ 'Content-Type': 'application/json' });
    });

    it('no añade Content-Type en una GET', async () => {
      await http.get('/foo');
      const headers = lastFetchInit().headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('envía el token Bearer cuando existe', async () => {
      setTokenProvider(() => 'secret-token');
      await http.get('/me');
      expect(lastFetchInit().headers).toMatchObject({ Authorization: 'Bearer secret-token' });
    });

    it('omite la cabecera de autenticación cuando no hay token', async () => {
      await http.get('/me');
      const headers = lastFetchInit().headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('suprime el token con anonymous aunque exista', async () => {
      setTokenProvider(() => 'secret-token');
      await http.get('/public', undefined, { anonymous: true });
      const headers = lastFetchInit().headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('respuestas', () => {
    it('devuelve el JSON de una respuesta 200', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ data: 42 }));
      const res = await http.get('/foo');
      expect(res).toEqual({ data: 42 });
    });

    it('devuelve undefined ante un 204 No Content', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
      const res = await http.get('/foo');
      expect(res).toBeUndefined();
    });
  });

  describe('errores', () => {
    it.each([400, 401, 404, 422, 500])('lanza ApiError con el status %i', async (status) => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        errorResponse(status, { message: 'Credenciales inválidas' }),
      );
      const err = await http.get('/me').catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err).toMatchObject({
        status,
        message: 'Credenciales inválidas',
      });
    });

    it('usa un mensaje genérico cuando el cuerpo del error no es JSON', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('no json');
        },
      });
      await expect(http.get('/boom')).rejects.toMatchObject({
        status: 500,
        message: 'Error 500',
      });
    });

    it('incluye los errors del cuerpo cuando están presentes', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        errorResponse(422, { message: 'Validation failed', errors: { email: ['Required'] } }),
      );
      const err = await http.get('/me').catch((e) => e);
      expect(err).toMatchObject({
        status: 422,
        message: 'Validation failed',
        errors: { email: ['Required'] },
      });
    });

    it('usa el status como mensaje cuando el cuerpo no trae message', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(errorResponse(503, { errors: {} }));
      const err = await http.get('/me').catch((e) => e);
      expect(err).toMatchObject({ status: 503, message: 'Error 503' });
    });
  });

  describe('AbortSignal', () => {
    it('propaga la señal de aborto al fetch', async () => {
      const controller = new AbortController();
      vi.stubGlobal('fetch', vi.fn((_url, opts) => {
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }));

      const promise = request('/foo', { signal: controller.signal });
      controller.abort();
      await expect(promise).rejects.toBeInstanceOf(DOMException);
    });
  });
});
