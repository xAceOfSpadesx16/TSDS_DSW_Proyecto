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

export type ModuleName = 'dice' | 'numbers' | 'roulette' | 'teams' | 'weighted';

export interface HistoryRecord {
  id: string;
  user_id: number;
  module_name: ModuleName;
  action: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
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

export interface CreateHistoryPayload {
  module_name: ModuleName;
  action: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
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