// =============================================================================
// AuthRepository
//
// Encapsula los endpoints de autenticación del backend. La capa de UI/stores
// consume este repositorio sin saber nada de URLs ni de headers.
// =============================================================================

import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../domain/types';
import { http } from './httpClient';

export const authRepository = {
  register(payload: RegisterPayload): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/register', payload);
  },

  login(payload: LoginPayload): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/login', payload);
  },

  me(): Promise<{ user: User }> {
    return http.get<{ user: User }>('/auth/me');
  },

  /**
   * Renueva el token vencido. El `httpClient` la invoca una sola vez por
   * ráfaga de 401 y comparte esa promesa entre las peticiones concurrentes.
   */
  refresh(): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/refresh');
  },

  logout(): Promise<{ message: string }> {
    return http.post<{ message: string }>('/auth/logout');
  },
};