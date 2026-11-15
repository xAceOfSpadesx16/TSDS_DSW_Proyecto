/** Registro de estrategias por módulo. */

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

/** Devuelve la estrategia del módulo con su tipo concreto. */
export function strategyFor<M extends ModuleName>(module: M): StrategyByModule[M] {
  const strategy: StrategyByModule[M] | undefined = STRATEGIES[module];
  if (!strategy) {
    throw new Error(`Estrategia no soportada para el módulo: ${module}`);
  }
  return strategy;
}

/** Lista los módulos con estrategia registrada. */
export function supportedModules(): ModuleName[] {
  return Object.keys(STRATEGIES) as ModuleName[];
}

export {
  diceStrategy,
  numbersStrategy,
  rouletteStrategy,
  teamsStrategy,
  weightedStrategy,
};
