// =============================================================================
// DiceStrategy — implementación del módulo `dice`.
//
// Una sola tirada o tirada múltiple vía `formula` (notación RPG: `2d6+3`).
// El resultado local y el resultado enviado al backend tienen la misma
// forma: `{ rolls, total, modifier, formula? }`.
// =============================================================================

import type { DiceInput, DiceResult } from '../domain/contracts';
import type { DrawStrategy } from '../domain/contracts';
import { randomInt } from '../lib/mathUtils';

const FORMULA_REGEX = /^(\d+)d(\d+)([+-]\d+)?$/i;

function rollOnce(sides: number): number {
  if (sides < 2) {
    throw new Error(`Dado no válido: debe tener al menos 2 caras (recibido ${sides}).`);
  }
  return randomInt(1, sides);
}

function rollWithFormula(formula: string): DiceResult {
  const match = FORMULA_REGEX.exec(formula.trim());
  if (!match) {
    throw new Error(`Fórmula inválida: "${formula}". Usa formato NdS (ej. 2d6+3).`);
  }
  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);
  const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollOnce(sides));
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  return {
    rolls,
    modifier,
    total: sum + modifier,
    formula,
  };
}

export class DiceStrategy implements DrawStrategy<DiceInput, DiceResult, DiceResult> {
  readonly moduleId = 'dice' as const;

  actionLabel(input: DiceInput): string {
    if (input.formula) {
      return input.formula.toLowerCase();
    }
    const modStr = input.modifier === 0 ? '' : `${input.modifier >= 0 ? '+' : ''}${input.modifier}`;
    return `d${input.sides}${modStr}`;
  }

  buildPayload(input: DiceInput): Record<string, unknown> {
    return {
      sides: input.sides,
      modifier: input.modifier,
      ...(input.count !== undefined ? { count: input.count } : {}),
      ...(input.formula ? { formula: input.formula } : {}),
    };
  }

  execute(input: DiceInput): { local: DiceResult; backend: DiceResult } {
    const result = input.formula
      ? rollWithFormula(input.formula)
      : this.rollSimple(input);
    return { local: result, backend: result };
  }

  private rollSimple(input: DiceInput): DiceResult {
    const count = Math.max(1, input.count ?? 1);
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(rollOnce(input.sides));
    }
    const sum = rolls.reduce((a, b) => a + b, 0);
    return {
      rolls,
      modifier: input.modifier,
      total: sum + input.modifier,
    };
  }
}

export const diceStrategy = new DiceStrategy();