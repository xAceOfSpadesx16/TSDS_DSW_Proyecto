/** Endpoints de autenticación. */

import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../domain/types';
import { http } from './httpClient';

/** Cliente de los endpoints de auth. */
export const authRepository = {
  /** Registra un usuario y devuelve la sesión. */
  register(payload: RegisterPayload): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/register', payload);
  },

  /** Inicia sesión con email y contraseña. */
  login(payload: LoginPayload): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/login', payload);
  },

  /** Devuelve el usuario del token actual. */
  me(): Promise<{ user: User }> {
    return http.get<{ user: User }>('/auth/me');
  },

  /** Renueva el token vencido. */
  refresh(): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/refresh');
  },

  /** Invalida el token actual. */
  logout(): Promise<{ message: string }> {
    return http.post<{ message: string }>('/auth/logout');
  },
};
