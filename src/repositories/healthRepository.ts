// =============================================================================
// healthRepository
//
// Check de disponibilidad del backend. Es público (sin sesión) y no falla con
// 401: si el backend no está, el error es de red, no de autenticación.
// =============================================================================

import type { HealthStatus } from '../domain/types';
import { http } from './httpClient';

export const healthRepository = {
  check(): Promise<HealthStatus> {
    // `anonymous` evita mandar el token: el health check no lo necesita y así
    // un 401 del backend no dispararía el handler de sesión vencida.
    return http.get<HealthStatus>('/health', undefined, { anonymous: true });
  },
};
