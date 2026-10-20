// =============================================================================
// Tipos del dominio — espejo fiel del contrato del backend Laravel.
// Mantener este archivo sincronizado con `app/Modules/History/Strategies/*`
// y `app/Modules/Auth/*` del backend.
// =============================================================================

// -----------------------------------------------------------------------------
// Autenticación
// -----------------------------------------------------------------------------

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

// -----------------------------------------------------------------------------
// Historial
// -----------------------------------------------------------------------------

// `ModuleName` se define en `contracts.ts` (es la clave de los mapas de
// payload/result por módulo) y se re-exporta acá porque es donde lo
// consumían el resto del código antes.
export type { ModuleName } from './contracts';
import type {
  ModuleName,
  ModulePayload,
  ModulePayloads,
  ModuleResult,
  ModuleResults,
} from './contracts';

export interface HistoryRecord {
  id: string;
  user_id: number;
  module_name: ModuleName;
  action: string;
  /** Parámetros del sorteo, tipados según `module_name`. */
  payload: ModulePayload;
  /** Salida del sorteo, tipada según `module_name`. */
  result: ModuleResult;
  created_at: string;
  updated_at: string;
}

export interface HistoryMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface HistoryListResponse {
  data: HistoryRecord[];
  meta: HistoryMeta;
}

/**
 * Cuerpo de `POST /api/history`.
 *
 * Se modela como unión discriminada por `module_name`: según el módulo,
 * `payload` y `result` tienen que ser de ese módulo. Antes ambos eran
 * `Record<string, unknown>`, que no encontraba relación entre el módulo y
 * sus campos y además rechazaba las `interface` del dominio.
 */
export type CreateHistoryPayload = {
  [M in ModuleName]: {
    module_name: M;
    action: string;
    payload: ModulePayloads[M];
    result: ModuleResults[M];
  };
}[ModuleName];

// -----------------------------------------------------------------------------
// Health
// -----------------------------------------------------------------------------

/**
 * Respuesta de `GET /api/health`.
 *
 * Refleja el closure de `routes/api.php`: `{ status, service, version, timestamp }`.
 * El `service` sale de `config('app.name')` en el backend.
 */
export interface HealthStatus {
  /** `ok` cuando el backend responde. */
  status: string;
  /** Nombre de la aplicación, de `config('app.name')`. */
  service: string;
  /** Versión del backend. */
  version: string;
  /** Momento del check en ISO-8601. */
  timestamp: string;
}

// -----------------------------------------------------------------------------
// Legal
// -----------------------------------------------------------------------------

/** Una sección del disclaimer (encabezado + párrafo). */
export interface LegalDisclaimerSection {
  heading: string;
  body: string;
}

/**
 * Respuesta de `GET /api/legal/disclaimer`.
 *
 * Refleja `LegalService::disclaimer()` del backend.
 */
export interface LegalDisclaimer {
  title: string;
  version: string;
  sections: LegalDisclaimerSection[];
}

// -----------------------------------------------------------------------------
// Errores de la API
// -----------------------------------------------------------------------------

/**
 * Forma estándar de error que devuelve el backend (ver bootstrap/app.php):
 * - 401: `{ message }`
 * - 422: `{ message, errors?: Record<string, string[]> }`
 * - 404: `{ message }`
 * - 500: `{ message }`
 */
export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = body.errors;
  }
}