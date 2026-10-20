// =============================================================================
// StrategyFactory
//
// Resuelve la estrategia correspondiente a un `ModuleName`. Es el único
// punto que las páginas y el `historyStore` consultan para ejecutar
// sorteos. Agregar un nuevo módulo = agregar una entrada en `STRATEGIES`
// y crear la clase — no se toca ningún consumidor.
// =============================================================================

import type {
  DiceInput,
  DiceResult,
  DrawStrategy,
  ModuleName,
  NumbersInput,
  NumbersResult,
  RouletteInput,
  RouletteResultBackend,
  RouletteResultLocal,
  TeamsInput,
  TeamsResult,
  WeightedInput,
  WeightedResultBackend,
  WeightedResultLocal,
} from '../domain/contracts';

import { diceStrategy } from './DiceStrategy';
import { numbersStrategy } from './NumbersStrategy';
import { rouletteStrategy } from './RouletteStrategy';
import { teamsStrategy } from './TeamsStrategy';
import { weightedStrategy } from './WeightedStrategy';

/**
 * Cada estrategia tipada por su módulo concreto.
 *
 * Antes se declaraba `DrawStrategy<unknown, unknown, Record<string, unknown>>`
 * y se casteaba cada estrategia con `as`, lo que además de perder el
 * tipado obligaba a los casts. Acá se declara el tipo real: cada entrada
 * conserva su firma y `strategyFor` la devuelve tal cual.
 */
type StrategyByModule = {
  dice: DrawStrategy<DiceInput, DiceResult, DiceResult>;
  numbers: DrawStrategy<NumbersInput, NumbersResult, NumbersResult>;
  roulette: DrawStrategy<RouletteInput, RouletteResultLocal, RouletteResultBackend>;
  teams: DrawStrategy<TeamsInput, TeamsResult, TeamsResult>;
  weighted: DrawStrategy<WeightedInput, WeightedResultLocal, WeightedResultBackend>;
};

const STRATEGIES: StrategyByModule = {
  dice: diceStrategy,
  numbers: numbersStrategy,
  roulette: rouletteStrategy,
  teams: teamsStrategy,
  weighted: weightedStrategy,
};

/**
 * Devuelve la estrategia del módulo pedido, ya con su tipo concreto.
 *
 * `M` se resuelve desde el argumento, así que `strategyFor('dice')` entrega
 * un `DrawStrategy<DiceInput, DiceResult, DiceResult>` sin casts.
 */
export function strategyFor<M extends ModuleName>(module: M): StrategyByModule[M] {
  const strategy: StrategyByModule[M] | undefined = STRATEGIES[module];
  if (!strategy) {
    throw new Error(`Estrategia no soportada para el módulo: ${module}`);
  }
  return strategy;
}

export function supportedModules(): ModuleName[] {
  return Object.keys(STRATEGIES) as ModuleName[];
}

// Re-exports convenientes para componentes que prefieran importar directo.
export {
  diceStrategy,
  numbersStrategy,
  rouletteStrategy,
  teamsStrategy,
  weightedStrategy,
};