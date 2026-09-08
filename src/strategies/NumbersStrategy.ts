// =============================================================================
// NumbersStrategy — módulo `numbers`.
//
// Genera `count` enteros en [min, max], con o sin repetición. El resultado
// se ordena ascendente para coincidir con el comportamiento del frontend
// original (`js/services/DiceService.js`).
// =============================================================================

import type { NumbersInput, NumbersResult } from '../domain/contracts';
import type { DrawStrategy } from '../domain/contracts';
import { randomInt, uniqueRandomInts } from '../lib/mathUtils';

export class NumbersStrategy
  implements DrawStrategy<NumbersInput, NumbersResult, NumbersResult>
{
  readonly moduleId = 'numbers' as const;

  actionLabel(input: NumbersInput): string {
    const unique = input.unique ? 'únicos' : 'con repetición';
    return `${input.count} números [${input.min}-${input.max}] (${unique})`;
  }

  buildPayload(input: NumbersInput): Record<string, unknown> {
    return {
      count: input.count,
      min: input.min,
      max: input.max,
      unique: input.unique,
    };
  }

  execute(input: NumbersInput): { local: NumbersResult; backend: NumbersResult } {
    if (input.count < 1) {
      throw new Error('La cantidad debe ser >= 1.');
    }
    if (input.max < input.min) {
      throw new Error(`El máximo (${input.max}) debe ser >= mínimo (${input.min}).`);
    }

    const numbers = input.unique
      ? uniqueRandomInts(input.count, input.min, input.max)
      : this.withRepetition(input.count, input.min, input.max);

    const result: NumbersResult = { numbers: numbers.slice().sort((a, b) => a - b) };
    return { local: result, backend: result };
  }

  private withRepetition(count: number, min: number, max: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(randomInt(min, max));
    }
    return out;
  }
}

export const numbersStrategy = new NumbersStrategy();