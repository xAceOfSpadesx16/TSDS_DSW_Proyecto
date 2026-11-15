/** Contratos de `payload` y `result` por módulo, espejo del backend. */

/** Identificador de módulo y clave de los mapas de contrato. */
export type ModuleName = 'dice' | 'numbers' | 'roulette' | 'teams' | 'weighted';

/** Entrada de una tirada de dados. */
export interface DiceInput {
  sides: number;
  modifier: number;
  count?: number;
  formula?: string;
}

/** Resultado de una tirada de dados. */
export interface DiceResult {
  rolls: number[];
  total: number;
  modifier: number;
  formula?: string;
}

/** Entrada del generador de números. */
export interface NumbersInput {
  count: number;
  min: number;
  max: number;
  unique: boolean;
}

/** Resultado del generador de números. */
export interface NumbersResult {
  numbers: number[];
}

/** Opción de la ruleta. */
export interface RouletteOption {
  label: string;
  color: string;
}

/** Entrada de la ruleta. */
export interface RouletteInput {
  options: RouletteOption[];
}

/** Resultado que persiste la ruleta. */
export interface RouletteResultBackend {
  winner: RouletteOption;
}

/** Resultado local de la ruleta con el ángulo final de la animación. */
export interface RouletteResultLocal extends RouletteResultBackend {
  finalAngle: number;
}

/** Modo de reparto de equipos. */
export type TeamsMode = 'count' | 'size';

/** Entrada del generador de equipos. */
export interface TeamsInput {
  participants: string[];
  mode: TeamsMode;
  value: number;
  exclusions?: Array<[string, string]>;
}

/** Resultado del generador de equipos. */
export interface TeamsResult {
  teams: string[][];
  colors: string[];
}

/** Participante del sorteo ponderado. */
export interface WeightedEntry {
  name: string;
  weight: number;
}

/** Entrada del sorteo ponderado. */
export interface WeightedInput {
  entries: WeightedEntry[];
  autoRemove?: boolean;
}

/** Resultado que persiste el sorteo ponderado. */
export interface WeightedResultBackend {
  winner: WeightedEntry;
  probability: number;
}

/** Resultado local del sorteo ponderado con los participantes restantes. */
export interface WeightedResultLocal extends WeightedResultBackend {
  remainingEntries: WeightedEntry[];
}

/** `payload` de cada módulo. */
export interface ModulePayloads {
  dice: DiceInput;
  numbers: NumbersInput;
  roulette: RouletteInput;
  teams: TeamsInput;
  weighted: WeightedInput;
}

/** `result` normalizado al backend de cada módulo. */
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

/** Par de resultados local y de backend de una ejecución. */
export interface DrawExecution<TLocal, TBackend> {
  local: TLocal;
  backend: TBackend;
}

/** Contrato que implementa cada estrategia de sorteo. */
export interface DrawStrategy<TInput, TLocal, TBackend> {
  readonly moduleId: ModuleName;

  /** Etiqueta humana del sorteo para el campo `action` del historial. */
  actionLabel(input: TInput): string;

  /** Construye el `payload` exacto que espera el backend. */
  buildPayload(input: TInput): TInput;

  /** Ejecuta el sorteo y devuelve el resultado local y el del backend. */
  execute(input: TInput): DrawExecution<TLocal, TBackend>;
}
