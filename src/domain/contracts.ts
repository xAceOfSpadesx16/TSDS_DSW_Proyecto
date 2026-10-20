// =============================================================================
// Contratos exactos de `payload` y `result` por módulo.
// Reflejan `App\Modules\History\Strategies\*Strategy` del backend.
// Si el backend agrega un campo, sumarlo acá y a la estrategia.
// =============================================================================

/**
 * Identificador de módulo. Vive acá (y no en `types.ts`) porque es la clave
 * de los mapas de contrato de más abajo; `types.ts` lo re-exporta para no
 * romper los imports existentes.
 */
export type ModuleName = 'dice' | 'numbers' | 'roulette' | 'teams' | 'weighted';

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
// Mapas de contrato por módulo
//
// Antes `payload` y `result` eran `Record<string, unknown>`, que no
// restringe nada y además no es asignable desde una `interface` (las
// interfaces no tienen index signature). Estos mapas son la fuente de
// verdad: `payload` y `result` se tipan según el módulo.
// =============================================================================

/** `payload` (parámetros de entrada) de cada módulo. */
export interface ModulePayloads {
  dice: DiceInput;
  numbers: NumbersInput;
  roulette: RouletteInput;
  teams: TeamsInput;
  weighted: WeightedInput;
}

/** `result` (salida normalizada al backend) de cada módulo. */
export interface ModuleResults {
  dice: DiceResult;
  numbers: NumbersResult;
  roulette: RouletteResultBackend;
  teams: TeamsResult;
  weighted: WeightedResultBackend;
}

/** `payload` de cualquier módulo. */
export type ModulePayload = ModulePayloads[ModuleName];

/** `result` de cualquier módulo. */
export type ModuleResult = ModuleResults[ModuleName];

// =============================================================================
// Interfaz `DrawStrategy`
//
// Una estrategia por módulo. Es "autosuficiente": sabe cómo armar el payload
// que el backend espera y cómo convertir su resultado local al shape exacto
// que el endpoint POST /api/history validará.
// =============================================================================

export interface DrawExecution<TLocal, TBackend> {
  /** Resultado local (lo que la UI necesita para renderizar). */
  local: TLocal;
  /** Resultado normalizado al contrato del backend (lo que se enviará al repo). */
  backend: TBackend;
}

export interface DrawStrategy<TInput, TLocal, TBackend> {
  readonly moduleId: ModuleName;

  /** Etiqueta humana del sorteo, usada para el campo `action` del historial. */
  actionLabel(input: TInput): string;

  /**
   * Construye el `payload` exacto que `CreateHistoryPayload` exige.
   *
   * Devuelve el tipo de entrada del módulo, no un `Record<string, unknown>`:
   * el payload *es* la forma normalizada de los parámetros del sorteo.
   */
  buildPayload(input: TInput): TInput;

  /**
   * Ejecuta el sorteo en el cliente y produce:
   * - `local`: resultado para uso de UI (puede incluir campos extra como
   *   `finalAngle` para animación o `remainingEntries` para sorteos sin
   *   reposición).
   * - `backend`: el subconjunto que cumple el contrato del backend.
   */
  execute(input: TInput): DrawExecution<TLocal, TBackend>;
}