// =============================================================================
// Cliente HTTP mínimo sobre `fetch`.
//
// - Base URL configurable vía `VITE_API_BASE_URL`; por defecto apunta al
//   backend de desarrollo (`http://127.0.0.1:8000/api`).
// - Inyecta `Authorization: Bearer <jwt>` cuando hay token (vía
//   `setTokenProvider` para evitar dependencia circular con el store).
// - Normaliza errores a `ApiError` con `status`, `message` y `errors`.
// - Ante un 401 con token, intenta renovar el token UNA vez (vía
//   `setTokenRefresher`) y repite la petición original. Si el refresh falla,
//   limpia la sesión como antes.
// =============================================================================

import { ApiError, type ApiErrorBody } from '../domain/types';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api';

// Resuelve la URL base eliminando las barras finales redundantes. Separada en
// función para que sea comprobable (la inicialización del módulo no siempre se
// atribuye a un test en la cobertura de ramas).
export function resolveBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
}

const baseUrl: string = resolveBaseUrl();

// Proveedor de token lazy: el authStore se registra a sí mismo una vez
// inicializado. Mientras no haya registro, las requests salen anónimas.
let tokenProvider: () => string | null = () => null;

export function setTokenProvider(provider: () => string | null): void {
  tokenProvider = provider;
}

/**
 * Callback invocado cuando una request con token vigente recibe un 401.
 * El httpClient no conoce el store: el authStore se registra aquí para
 * poder limpiar la sesión sin dependencias circulares.
 *
 * Recibe el token que recibió el 401 para que el store pueda distinguir si
 * `localStorage` todavía tiene ese token o si otra pestaña ya lo renovó.
 *
 * No se redirige a /login a propósito: el 401 se propaga al llamador y
 * el store queda en estado deslogueado.
 */
let unauthorizedHandler: (staleToken: string) => void = () => {};

export function setUnauthorizedHandler(handler: (staleToken: string) => void): void {
  unauthorizedHandler = handler;
}

/**
 * Renueva el token: recibe el token vencido y devuelve el nuevo (o `null`
 * si no se pudo). El `httpClient` no conoce el repositorio de auth; el
 * `authStore` se registra aquí para evitar una dependencia circular.
 *
 * Si no hay refresher registrado (tests, o antes de `main.tsx`), el 401
 * se comporta como antes: limpia la sesión y no reintenta.
 */
type TokenRefresher = (staleToken: string) => Promise<string | null>;

let tokenRefresher: TokenRefresher | null = null;

export function setTokenRefresher(refresher: TokenRefresher): void {
  tokenRefresher = refresher;
}

/**
 * Lee el token persistido en `localStorage`. Lo registra el `authStore`,
 * dueño de la clave de storage, para no duplicarla acá.
 *
 * Sirve para el caso de varias pestañas: si otra pestaña renovó el token,
 * esta pestaña todavía tiene el viejo en memoria, pero `localStorage` ya
 * tiene el nuevo.
 */
type StoredTokenReader = () => string | null;

let storedTokenReader: StoredTokenReader = () => null;

export function setStoredTokenReader(reader: StoredTokenReader): void {
  storedTokenReader = reader;
}

/**
 * Adopta en memoria el token que otra pestaña persistió, para que las
 * siguientes peticiones de esta pestaña lo usen sin volver a recibir 401.
 */
type AdoptedTokenHandler = (token: string) => void;

let adoptedTokenHandler: AdoptedTokenHandler = () => {};

export function setAdoptedTokenHandler(handler: AdoptedTokenHandler): void {
  adoptedTokenHandler = handler;
}

/**
 * Rutas donde un 401 NO dispara refresh.
 *
 * `/auth/login` y `/auth/register` no llevan token (un 401 ahí es
 * "credenciales inválidas"), y `/auth/refresh` es justamente la petición
 * que intenta renovar: reintentarla recursaría.
 */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

function allowsRefresh(path: string): boolean {
  return !NO_REFRESH_PATHS.includes(path);
}

/**
 * Refresh en curso, compartido por todas las peticiones que reciben un
 * 401 a la vez.
 *
 * Si tres peticiones fallan juntas, las tres esperan la misma promesa y
 * disparan un único `POST /auth/refresh`.
 */
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

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Si true, no agrega el header `Authorization` aunque haya token. */
  anonymous?: boolean;
  signal?: AbortSignal;
  /**
   * Interno: marca que esta petición ya intentó el refresh, para no
   * reintentarla en bucle si el token nuevo también da 401.
   * No lo setea ningún repositorio.
   */
  retried?: boolean;
  /**
   * Interno: token a enviar en la repetición tras un refresh exitoso.
   * Tiene prioridad sobre el `tokenProvider`. No lo setea ningún repositorio.
   */
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

  // El override (repetición post-refresh) tiene prioridad sobre el provider.
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

    // 401 con token enviado = el token venció o fue invalidado. Se intenta
    // renovar una vez y repetir la petición original con el token nuevo.
    if (response.status === 401 && headers['Authorization']) {
      const staleToken = headers['Authorization'].replace(/^Bearer /, '');

      // Varias pestañas: si `localStorage` ya tiene un token distinto del
      // que recibió el 401, otra pestaña lo renovó. Se adopta ese token y se
      // repite la petición sin pedir un refresh propio.
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

      // `retried` evita el bucle: si el token nuevo también da 401, no se
      // vuelve a pedir refresh.
      const freshToken =
        !retried && allowsRefresh(path) ? await refreshToken(staleToken) : null;

      if (freshToken) {
        return request<TResponse>(path, {
          ...options,
          retried: true,
          tokenOverride: freshToken,
        });
      }

      // No se pudo renovar (o el token nuevo tampoco sirve): la sesión ya no
      // existe, se limpia y el error se propaga para que el llamador lo
      // muestre. El store solo borra `localStorage` si sigue teniendo el
      // token que falló: otra pestaña pudo haberlo renovado mientras tanto.
      unauthorizedHandler(staleToken);
    }

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
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body' | 'query'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};

/** Expuesto para diagnósticos en consola durante desarrollo. */
export const httpBaseUrl = baseUrl;