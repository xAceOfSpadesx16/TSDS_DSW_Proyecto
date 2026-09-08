// =============================================================================
// Contratos exactos de `payload` y `result` por módulo.
// Reflejan `App\Modules\History\Strategies\*Strategy` del backend.
// Si el backend agrega un campo, sumarlo acá y a la estrategia.
// =============================================================================

import type { ModuleName } from './types';

// ---- dice --------------------------------------------------------------------
export interface DiceInput {
  sides: number;
  modifier: number;
  count?: number;
  formula?: string;
}

export interface DiceResult {
  rolls: number[];
  total: number;
  modifier: number;
  formula?: string;
}

// ---- numbers -----------------------------------------------------------------
export interface NumbersInput {
  count: number;
  min: number;
  max: number;
  unique: boolean;
}

export interface NumbersResult {
  numbers: number[];
}

// ---- roulette ----------------------------------------------------------------
export interface RouletteOption {
  label: string;
  color: string;
}

export interface RouletteInput {
  options: RouletteOption[];
}

export interface RouletteResultBackend {
  winner: RouletteOption;
}

/** Resultado local extendido con el ángulo para la animación del canvas. */
export interface RouletteResultLocal extends RouletteResultBackend {
  finalAngle: number;
}

// ---- teams -------------------------------------------------------------------
export type TeamsMode = 'count' | 'size';

export interface TeamsInput {
  participants: string[];
  mode: TeamsMode;
  value: number;
  exclusions?: Array<[string, string]>;
}

export interface TeamsResult {
  teams: string[][];
  colors: string[];
}

// ---- weighted ----------------------------------------------------------------
export interface WeightedEntry {
  name: string;
  weight: number;
}

export interface WeightedInput {
  entries: WeightedEntry[];
  autoRemove?: boolean;
}

export interface WeightedResultBackend {
  winner: WeightedEntry;
  probability: number;
}

/** Resultado local extendido con los participantes que quedan tras el sorteo. */
export interface WeightedResultLocal extends WeightedResultBackend {
  remainingEntries: WeightedEntry[];
}

// =============================================================================
// Interfaz `DrawStrategy`
//
// Una estrategia por módulo. Es "autosuficiente": sabe cómo armar el payload
// que el backend espera y cómo convertir su resultado local al shape exacto
// que el endpoint POST /api/history validará.
// =============================================================================

export interface DrawExecution<TInput, TLocal, TBackend extends Record<string, unknown>> {
  /** Resultado local (lo que la UI necesita para renderizar). */
  local: TLocal;
  /** Resultado normalizado al contrato del backend (lo que se enviará al repo). */
  backend: TBackend;
}

export interface DrawStrategy<TInput, TLocal, TBackend extends Record<string, unknown>> {
  readonly moduleId: ModuleName;

  /** Etiqueta humana del sorteo, usada para el campo `action` del historial. */
  actionLabel(input: TInput): string;

  /** Construye el payload exacto que `CreateHistoryPayload` exige. */
  buildPayload(input: TInput): Record<string, unknown>;

  /**
   * Ejecuta el sorteo en el cliente y produce:
   * - `local`: resultado para uso de UI (puede incluir campos extra como
   *   `finalAngle` para animación o `remainingEntries` para sorteos sin
   *   reposición).
   * - `backend`: el subconjunto que cumple el contrato del backend.
   */
  execute(input: TInput): DrawExecution<TLocal, TLocal, TBackend>;
}