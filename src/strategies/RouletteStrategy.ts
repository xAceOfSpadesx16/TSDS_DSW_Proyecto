/** Estrategia de la ruleta. */

import type {
  RouletteInput,
  RouletteOption,
  RouletteResultBackend,
  RouletteResultLocal,
} from '../domain/contracts';
import type { DrawExecution, DrawStrategy } from '../domain/contracts';
import { randomInt } from '../lib/mathUtils';

/** Segmento de la ruleta con sus ángulos. */
export interface RouletteSegment {
  label: string;
  color: string;
  startAngle: number;
  endAngle: number;
}

/** Divide las opciones en segmentos de igual ángulo. */
export function calculateSegments(options: readonly RouletteOption[]): RouletteSegment[] {
  if (options.length === 0) {
    throw new Error('La ruleta necesita al menos una opción.');
  }
  const anglePerItem = (Math.PI * 2) / options.length;
  return options.map((option, index) => ({
    label: option.label,
    color: option.color,
    startAngle: index * anglePerItem,
    endAngle: (index + 1) * anglePerItem,
  }));
}

/** Calcula el ángulo final de la animación para el segmento ganador. */
export function generateSpinAngle(
  currentRotation: number,
  targetIndex: number,
  totalSegments: number,
): number {
  const extraTurns = randomInt(4, 8);
  const baseTurns = extraTurns * Math.PI * 2;
  const anglePerSegment = (Math.PI * 2) / totalSegments;
  const segmentCenter = targetIndex * anglePerSegment + anglePerSegment / 2;
  const target = -Math.PI / 2 - segmentCenter;
  return currentRotation + baseTurns + target;
}

/** Elige un ganador y calcula el ángulo de la animación. */
export class RouletteStrategy
  implements
    DrawStrategy<RouletteInput, RouletteResultLocal, RouletteResultBackend>
{
  readonly moduleId = 'roulette' as const;

  /** Describe la cantidad de opciones. */
  actionLabel(input: RouletteInput): string {
    return `Ruleta con ${input.options.length} opciones`;
  }

  /** Normaliza el payload al contrato del backend. */
  buildPayload(input: RouletteInput): RouletteInput {
    return {
      options: input.options.map((o) => ({ label: o.label, color: o.color })),
    };
  }

  /** Ejecuta el giro. */
  execute(input: RouletteInput): DrawExecution<RouletteResultLocal, RouletteResultBackend> {
    if (input.options.length === 0) {
      throw new Error('Agregá al menos una opción para girar la ruleta.');
    }
    const targetIndex = randomInt(0, input.options.length - 1);
    const winner = input.options[targetIndex];
    const finalAngle = generateSpinAngle(0, targetIndex, input.options.length);
    return {
      local: { winner, finalAngle },
      backend: { winner },
    };
  }
}

/** Instancia compartida de la estrategia. */
export const rouletteStrategy = new RouletteStrategy();
