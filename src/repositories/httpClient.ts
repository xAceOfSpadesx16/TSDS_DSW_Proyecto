/** Cliente HTTP mínimo sobre `fetch`, con JWT y refresh automático. */

import { ApiError, type ApiErrorBody } from '../domain/types';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api';

/** Resuelve la URL base sin barras finales. */
export function resolveBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
}

const baseUrl: string = resolveBaseUrl();

let tokenProvider: () => string | null = () => null;

/** Registra el proveedor del token en memoria. */
export function setTokenProvider(provider: () => string | null): void {
  tokenProvider = provider;
}

let unauthorizedHandler: (staleToken: string) => void = () => {};

/** Registra el handler que limpia la sesión ante un 401 irrecuperable. */
export function setUnauthorizedHandler(handler: (staleToken: string) => void): void {
  unauthorizedHandler = handler;
}

type TokenRefresher = (staleToken: string) => Promise<string | null>;

let tokenRefresher: TokenRefresher | null = null;

/** Registra el refresher que renueva el token vencido. */
export function setTokenRefresher(refresher: TokenRefresher): void {
  tokenRefresher = refresher;
}

type StoredTokenReader = () => string | null;

let storedTokenReader: StoredTokenReader = () => null;

/** Registra el lector del token persistido en `localStorage`. */
export function setStoredTokenReader(reader: StoredTokenReader): void {
  storedTokenReader = reader;
}

type AdoptedTokenHandler = (token: string) => void;

let adoptedTokenHandler: AdoptedTokenHandler = () => {};

/** Registra el handler que adopta un token renovado por otra pestaña. */
export function setAdoptedTokenHandler(handler: AdoptedTokenHandler): void {
  adoptedTokenHandler = handler;
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

function allowsRefresh(path: string): boolean {
  return !NO_REFRESH_PATHS.includes(path);
}

let inFlightRefresh: Promise<string | null> | null = null;

function refreshToken(staleToken: string): Promise<string | null> {
  if (!tokenRefresher) {
    return Promise.resolve(null);
  }
  if (!inFlightRefresh) {
    inFlightRefresh = tokenRefresher(staleToken).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

/** Opciones de una petición HTTP. */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  anonymous?: boolean;
  signal?: AbortSignal;
  retried?: boolean;
  tokenOverride?: string;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(baseUrl + (path.startsWith('/') ? path : `/${path}`));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const data = (await response.json()) as Partial<ApiErrorBody>;
    return {
      message: data.message ?? `Error ${response.status}`,
      ...(data.errors ? { errors: data.errors } : {}),
    };
  } catch {
    return { message: `Error ${response.status}` };
  }
}

/** Ejecuta una petición y normaliza errores a `ApiError`. */
export async function request<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const {
    method = 'GET',
    body,
    query,
    anonymous = false,
    signal,
    retried = false,
    tokenOverride,
  } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const authToken = tokenOverride ?? (anonymous ? null : tokenProvider());
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);

    if (response.status === 401 && headers['Authorization']) {
      const staleToken = headers['Authorization'].replace(/^Bearer /, '');

      if (!retried && allowsRefresh(path)) {
        const storedToken = storedTokenReader();
        if (storedToken && storedToken !== staleToken) {
          adoptedTokenHandler(storedToken);
          return request<TResponse>(path, {
            ...options,
            retried: true,
            tokenOverride: storedToken,
          });
        }
      }

      const freshToken =
        !retried && allowsRefresh(path) ? await refreshToken(staleToken) : null;

      if (freshToken) {
        return request<TResponse>(path, {
          ...options,
          retried: true,
          tokenOverride: freshToken,
        });
      }

      unauthorizedHandler(staleToken);
    }

    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

/** Atajos de GET, POST y DELETE. */
export const http = {
  get: <T>(path: string, query?: RequestOptions['query'], opts?: Omit<RequestOptions, 'method' | 'body' | 'query'>) =>
    request<T>(path, { ...opts, method: 'GET', query }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body' | 'query'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};

/** URL base en uso, útil para diagnósticos. */
export const httpBaseUrl = baseUrl;
