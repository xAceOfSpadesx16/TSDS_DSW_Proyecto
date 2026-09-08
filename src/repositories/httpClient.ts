// =============================================================================
// Cliente HTTP mínimo sobre `fetch`.
//
// - Base URL configurable vía `VITE_API_BASE_URL`; por defecto apunta al
//   backend de desarrollo (`http://127.0.0.1:8000/api`).
// - Inyecta `Authorization: Bearer <jwt>` cuando hay token (vía
//   `setTokenProvider` para evitar dependencia circular con el store).
// - Normaliza errores a `ApiError` con `status`, `message` y `errors`.
// =============================================================================

import { ApiError, type ApiErrorBody } from '../domain/types';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api';

const baseUrl: string =
  (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');

// Proveedor de token lazy: el authStore se registra a sí mismo una vez
// inicializado. Mientras no haya registro, las requests salen anónimas.
let tokenProvider: () => string | null = () => null;

export function setTokenProvider(provider: () => string | null): void {
  tokenProvider = provider;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Si true, no agrega el header `Authorization` aunque haya token. */
  anonymous?: boolean;
  signal?: AbortSignal;
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
  // Intentamos leer JSON; si falla, devolvemos un cuerpo genérico.
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

export async function request<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { method = 'GET', body, query, anonymous = false, signal } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!anonymous) {
    const token = tokenProvider();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    throw new ApiError(response.status, errorBody);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

// Helpers de azúcar sintáctica. Mantienen los repositorios concisos.
export const http = {
  get: <T>(path: string, query?: RequestOptions['query'], opts?: Omit<RequestOptions, 'method' | 'body' | 'query'>) =>
    request<T>(path, { ...opts, method: 'GET', query }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
};

/** Expuesto para diagnósticos en consola durante desarrollo. */
export const httpBaseUrl = baseUrl;