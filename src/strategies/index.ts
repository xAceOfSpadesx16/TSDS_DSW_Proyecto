// =============================================================================
// StrategyFactory
//
// Resuelve la estrategia correspondiente a un `ModuleName`. Es el único
// punto que las páginas y el `historyStore` consultan para ejecutar
// sorteos. Agregar un nuevo módulo = agregar una entrada en `STRATEGIES`
// y crear la clase — no se toca ningún consumidor.
// =============================================================================

import type { ModuleName } from '../domain/types';
import type { DrawStrategy } from '../domain/contracts';

import { diceStrategy } from './DiceStrategy';
import { numbersStrategy } from './NumbersStrategy';
import { rouletteStrategy } from './RouletteStrategy';
import { teamsStrategy } from './TeamsStrategy';
import { weightedStrategy } from './WeightedStrategy';

// Unión explícita de tipos de estrategia para `make()`: la firma concreta
// cambia por módulo pero todas extienden `DrawStrategy<unknown, unknown, ...>`.
type AnyStrategy = DrawStrategy<unknown, unknown, Record<string, unknown>>;

const STRATEGIES: Record<ModuleName, AnyStrategy> = {
  dice: diceStrategy as AnyStrategy,
  numbers: numbersStrategy as AnyStrategy,
  roulette: rouletteStrategy as AnyStrategy,
  teams: teamsStrategy as AnyStrategy,
  weighted: weightedStrategy as AnyStrategy,
};

export function strategyFor<T extends AnyStrategy>(module: ModuleName): T {
  const strategy = STRATEGIES[module];
  if (!strategy) {
    throw new Error(`Estrategia no soportada para el módulo: ${module}`);
  }
  return strategy as T;
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