/** Estado de autenticación persistido en `localStorage`. */

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

/** Estado y acciones de autenticación. */
export interface AuthState {
  user: User | null;
  token: string | null;
  expiresAt: number | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;

  /** Revalida la sesión persistida al arrancar. */
  hydrate(): Promise<void>;
  /** Inicia sesión. */
  login(payload: LoginPayload): Promise<void>;
  /** Registra un usuario. */
  register(payload: RegisterPayload): Promise<void>;
  /** Cierra la sesión local y avisa al backend. */
  logout(): Promise<void>;
}

function clearSession(set: (partial: Partial<AuthState>) => void): void {
  persist(null);
  set({ user: null, token: null, expiresAt: null, status: 'idle', error: null });
}

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

/** Hook del estado de autenticación. */
export const useAuthStore = create<AuthState>((set, get) => {
  const persisted = loadPersisted();
  return {
    user: persisted?.user ?? null,
    token: persisted?.token ?? null,
    expiresAt: persisted?.expires_at ?? null,
    status: 'idle',
    error: null,

    async hydrate() {
      const { token, expiresAt } = get();

      if (!token) {
        return;
      }

      if (expiresAt !== null && Date.now() >= expiresAt) {
        const renewed = await refreshSession(set);
        if (!renewed) {
          clearSession(set);
        }
        return;
      }

      try {
        const { user } = await authRepository.me();
        set({ user, status: 'idle', error: null });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearSession(set);
          return;
        }
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
      try {
        await authRepository.logout();
      } catch {
        // El borrado local es lo que importa.
      }
      clearSession(set);
    },
  };
});

/** Indica si hay usuario y token en memoria. */
export const selectIsAuthenticated = (s: AuthState): boolean =>
  s.token !== null && s.user !== null;

/** Conecta el `httpClient` con el token del store. */
export function bindAuthStoreToHttpClient(): void {
  setTokenProvider(() => useAuthStore.getState().token);

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

  setTokenRefresher((staleToken) =>
    refreshSession(useAuthStore.setState, staleToken),
  );
}
