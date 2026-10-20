// =============================================================================
// authStore
//
// Estado de autenticación del usuario. Persiste `{ user, token }` en
// localStorage para sobrevivir a recargas. Expone selectores derivados
// (`isAuthenticated`) y un binding con el httpClient para inyectar el JWT.
// =============================================================================

import { create } from 'zustand';

import type { LoginPayload, RegisterPayload, User } from '../domain/types';
import { ApiError } from '../domain/types';
import {
  readStoredJson,
  removeStoredKey,
  writeStoredJson,
} from '../lib/storage';
import { authRepository } from '../repositories/authRepository';
import {
  setAdoptedTokenHandler,
  setStoredTokenReader,
  setTokenProvider,
  setTokenRefresher,
  setUnauthorizedHandler,
} from '../repositories/httpClient';

const STORAGE_KEY = 'thrive_auth_v1';

interface PersistedAuth {
  user: User;
  token: string;
  expires_at: number | null;
}

function isPersistedAuth(value: unknown): value is PersistedAuth {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    typeof candidate.user === 'object' &&
    candidate.user !== null &&
    (candidate.expires_at === null || typeof candidate.expires_at === 'number')
  );
}

function loadPersisted(): PersistedAuth | null {
  return readStoredJson(STORAGE_KEY, isPersistedAuth);
}

function persist(state: PersistedAuth | null): void {
  if (state === null) {
    removeStoredKey(STORAGE_KEY);
  } else {
    writeStoredJson(STORAGE_KEY, state);
  }
}

export interface AuthState {
  user: User | null;
  token: string | null;
  /** Timestamp epoch (ms) en que expira el token, o null si desconocido. */
  expiresAt: number | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;

  hydrate(): Promise<void>;
  login(payload: LoginPayload): Promise<void>;
  register(payload: RegisterPayload): Promise<void>;
  logout(): Promise<void>;
}

/**
 * Limpia la sesión persistida y el estado en memoria.
 *
 * Se usa en tres lugares: logout explícito, token vencido durante
 * `hydrate()` y 401 recibido por el httpClient. Cada uno necesita el
 * `set` del store, que solo existe dentro de `create`, así que la
 * acción se declara aparte y se recibe por parámetro.
 */
function clearSession(set: (partial: Partial<AuthState>) => void): void {
  persist(null);
  set({ user: null, token: null, expiresAt: null, status: 'idle', error: null });
}

/**
 * Pide un token nuevo y lo persiste con su expiración.
 *
 * Es la acción que usa el `httpClient` cuando recibe un 401, y también la
 * que usa `hydrate()` cuando el token guardado ya venció. Devuelve `null`
 * si el backend no renovó nada, para que el llamador decida si cierra la
 * sesión.
 *
 * @param staleToken Token que el backend rechazó; solo se usa para el log.
 */
async function refreshSession(
  set: (partial: Partial<AuthState>) => void,
  staleToken?: string,
): Promise<string | null> {
  try {
    const res = await authRepository.refresh();
    const expiresAt = Date.now() + res.expires_in * 1000;
    persist({ user: res.user, token: res.token, expires_at: expiresAt });
    set({ user: res.user, token: res.token, expiresAt, status: 'idle', error: null });
    return res.token;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[authStore] no se pudo renovar el token${staleToken ? ' rechazado' : ' vencido'}:`,
      err,
    );
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  const persisted = loadPersisted();
  return {
    user: persisted?.user ?? null,
    token: persisted?.token ?? null,
    expiresAt: persisted?.expires_at ?? null,
    status: 'idle',
    error: null,

    /**
     * Revalida la sesión persistida al arrancar la app.
     *
     * Si `expires_at` ya pasó se intenta un refresh antes de cerrar la
     * sesión: el token puede seguir siendo renovable dentro de la ventana
     * del backend (14 días). Si el refresh no prospera, se cierra.
     */
    async hydrate() {
      const { token, expiresAt } = get();

      if (!token) {
        return;
      }

      if (expiresAt !== null && Date.now() >= expiresAt) {
        const renewed = await refreshSession(set);
        if (!renewed) {
          // Token vencido y no renovable: se cierra la sesión.
          clearSession(set);
        }
        return;
      }

      try {
        const { user } = await authRepository.me();
        set({ user, status: 'idle', error: null });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // El backend rechazó el token: la sesión no existe más.
          clearSession(set);
          return;
        }
        // Cualquier otro fallo (red caída, 500, timeout) no prueba que el
        // token sea inválido, así que mantenemos la sesión y dejamos el
        // error visible. El usuario sigue operando como hasta ahora.
        set({ status: 'error', error: 'No se pudo verificar la sesión.' });
      }
    },

    async login(payload) {
      set({ status: 'loading', error: null });
      try {
        const res = await authRepository.login(payload);
        const expiresAt = Date.now() + res.expires_in * 1000;
        const snapshot: PersistedAuth = {
          user: res.user,
          token: res.token,
          expires_at: expiresAt,
        };
        persist(snapshot);
        set({
          user: res.user,
          token: res.token,
          expiresAt,
          status: 'idle',
          error: null,
        });
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.';
        set({ status: 'error', error: msg });
        throw err;
      }
    },

    async register(payload) {
      set({ status: 'loading', error: null });
      try {
        const res = await authRepository.register(payload);
        const expiresAt = Date.now() + res.expires_in * 1000;
        const snapshot: PersistedAuth = {
          user: res.user,
          token: res.token,
          expires_at: expiresAt,
        };
        persist(snapshot);
        set({
          user: res.user,
          token: res.token,
          expiresAt,
          status: 'idle',
          error: null,
        });
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'No se pudo completar el registro.';
        set({ status: 'error', error: msg });
        throw err;
      }
    },

    async logout() {
      // Best-effort contra el backend (puede fallar si el token ya expiró).
      try {
        await authRepository.logout();
      } catch {
        // Ignorar: el borrado local es lo que importa.
      }
      clearSession(set);
    },
  };
});

// Selectores derivados.
export const selectIsAuthenticated = (s: AuthState): boolean =>
  s.token !== null && s.user !== null;

/**
 * Conecta el httpClient al token del store. Llamar una sola vez en `main.tsx`
 * para evitar dependencias circulares entre el store y el cliente.
 */
export function bindAuthStoreToHttpClient(): void {
  setTokenProvider(() => useAuthStore.getState().token);

  // Varias pestañas: el httpClient compara el token que recibió el 401 con
  // el persistido. Si otra pestaña ya lo renovó, adopta ese token en vez de
  // pedir un refresh propio.
  setStoredTokenReader(() => loadPersisted()?.token ?? null);
  setAdoptedTokenHandler((token) => {
    const persisted = loadPersisted();
    if (!persisted || persisted.token !== token) {
      return;
    }
    useAuthStore.setState({
      user: persisted.user,
      token: persisted.token,
      expiresAt: persisted.expires_at,
      status: 'idle',
      error: null,
    });
  });

  // Un 401 en cualquier request con token deja la sesión muerta: la
  // limpiamos sin redirigir (el error igual lo recibe el llamador). Si
  // `localStorage` ya tiene otro token, otra pestaña lo renovó: se adopta
  // y NO se borra la persistencia.
  setUnauthorizedHandler((staleToken) => {
    const persisted = loadPersisted();
    if (persisted && persisted.token !== staleToken) {
      useAuthStore.setState({
        user: persisted.user,
        token: persisted.token,
        expiresAt: persisted.expires_at,
        status: 'idle',
        error: null,
      });
      return;
    }
    clearSession(useAuthStore.setState);
  });

  // Antes de limpiar, el httpClient intenta renovar el token una vez.
  setTokenRefresher((staleToken) =>
    refreshSession(useAuthStore.setState, staleToken),
  );
}