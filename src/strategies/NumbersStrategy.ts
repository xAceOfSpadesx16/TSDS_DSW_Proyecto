/** Estrategia del generador de números. */

import type { NumbersInput, NumbersResult } from '../domain/contracts';
import type { DrawExecution, DrawStrategy } from '../domain/contracts';
import { randomInt, uniqueRandomInts } from '../lib/mathUtils';

/** Genera números enteros con o sin repetición. */
export class NumbersStrategy
  implements DrawStrategy<NumbersInput, NumbersResult, NumbersResult>
{
  readonly moduleId = 'numbers' as const;

  /** Describe cantidad, rango y unicidad. */
  actionLabel(input: NumbersInput): string {
    const unique = input.unique ? 'únicos' : 'con repetición';
    return `${input.count} números [${input.min}-${input.max}] (${unique})`;
  }

  /** Normaliza el payload al contrato del backend. */
  buildPayload(input: NumbersInput): NumbersInput {
    return {
      count: input.count,
      min: input.min,
      max: input.max,
      unique: input.unique,
    };
  }

  /** Genera los números y los devuelve ordenados. */
  execute(input: NumbersInput): DrawExecution<NumbersResult, NumbersResult> {
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

/** Instancia compartida de la estrategia. */
export const numbersStrategy = new NumbersStrategy();
