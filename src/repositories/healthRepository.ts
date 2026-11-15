/** Check de disponibilidad del backend. */

import type { HealthStatus } from '../domain/types';
import { http } from './httpClient';

/** Cliente del health check. */
export const healthRepository = {
  /** Consulta `GET /api/health` sin enviar el token. */
  check(): Promise<HealthStatus> {
    return http.get<HealthStatus>('/health', undefined, { anonymous: true });
  },
};
