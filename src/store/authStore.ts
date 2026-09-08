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
import { authRepository } from '../repositories/authRepository';
import { setTokenProvider } from '../repositories/httpClient';

const STORAGE_KEY = 'thrive_auth_v1';

interface PersistedAuth {
  user: User;
  token: string;
  expires_at: number | null;
}

function loadPersisted(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAuth;
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: PersistedAuth | null): void {
  if (state === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export interface AuthState {
  user: User | null;
  token: string | null;
  /** Timestamp epoch (ms) en que expira el token, o null si desconocido. */
  expiresAt: number | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;

  hydrate(): void;
  login(payload: LoginPayload): Promise<void>;
  register(payload: RegisterPayload): Promise<void>;
  logout(): Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  const persisted = loadPersisted();
  return {
    user: persisted?.user ?? null,
    token: persisted?.token ?? null,
    expiresAt: persisted?.expires_at ?? null,
    status: 'idle',
    error: null,

    hydrate() {
      // Hook reservado para refresh manual contra /me cuando agreguemos
      // manejo de expiración silenciosa.
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
      persist(null);
      set({ user: null, token: null, expiresAt: null, status: 'idle', error: null });
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
}