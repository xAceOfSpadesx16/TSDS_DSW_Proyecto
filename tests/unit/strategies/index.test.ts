// =============================================================================
// Unit tests — src/strategies/index.ts (fábrica). PLAN 4.2.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  strategyFor,
  supportedModules,
  diceStrategy,
  numbersStrategy,
  rouletteStrategy,
  teamsStrategy,
  weightedStrategy,
} from '../../../src/strategies';
import type { ModuleName } from '../../../src/domain/types';

describe('StrategyFactory', () => {
  it('resuelve cada estrategia nominal a su instancia', () => {
    expect(strategyFor('dice')).toBe(diceStrategy);
    expect(strategyFor('numbers')).toBe(numbersStrategy);
    expect(strategyFor('roulette')).toBe(rouletteStrategy);
    expect(strategyFor('teams')).toBe(teamsStrategy);
    expect(strategyFor('weighted')).toBe(weightedStrategy);
  });

  it('lanza ante módulo desconocido indicando que no está soportado', () => {
    expect(() => strategyFor('nope' as ModuleName)).toThrow(/no soportada/);
  });

  it('supportedModules devuelve exactamente los cinco módulos', () => {
    expect(supportedModules()).toEqual([
      'dice',
      'numbers',
      'roulette',
      'teams',
      'weighted',
    ]);
  });
});
