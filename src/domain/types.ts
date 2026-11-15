/** Tipos del dominio que reflejan el contrato de la API. */

/** Usuario autenticado que devuelve el backend. */
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Respuesta de login y registro. */
export interface AuthResponse {
  user: User;
  token: string;
  token_type: 'bearer';
  expires_in: number;
}

/** Credenciales de `POST /api/auth/login`. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Datos de `POST /api/auth/register`. */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export type { ModuleName } from './contracts';
import type {
  ModuleName,
  ModulePayload,
  ModulePayloads,
  ModuleResult,
  ModuleResults,
} from './contracts';

/** Registro de historial tal como lo devuelve el backend. */
export interface HistoryRecord {
  id: string;
  user_id: number;
  module_name: ModuleName;
  action: string;
  payload: ModulePayload;
  result: ModuleResult;
  created_at: string;
  updated_at: string;
}

/** Metadatos de paginación de `GET /api/histories`. */
export interface HistoryMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Lista paginada de historial. */
export interface HistoryListResponse {
  data: HistoryRecord[];
  meta: HistoryMeta;
}

/** Cuerpo de `POST /api/history`, discriminado por módulo. */
export type CreateHistoryPayload = {
  [M in ModuleName]: {
    module_name: M;
    action: string;
    payload: ModulePayloads[M];
    result: ModuleResults[M];
  };
}[ModuleName];

/** Respuesta de `GET /api/health`. */
export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

/** Sección del aviso legal. */
export interface LegalDisclaimerSection {
  heading: string;
  body: string;
}

/** Respuesta de `GET /api/legal/disclaimer`. */
export interface LegalDisclaimer {
  title: string;
  version: string;
  sections: LegalDisclaimerSection[];
}

/** Cuerpo de error estándar de la API. */
export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

/** Error HTTP de la API con estado y errores de validación. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;

  /** Crea el error con su estado y cuerpo. */
  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = body.errors;
  }
}
