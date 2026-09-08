// =============================================================================
// RouletteStrategy — módulo `roulette`.
//
// - Elige ganador uniformemente entre las opciones provistas.
// - Calcula el ángulo final para la animación del canvas (suma de 4–8
//   vueltas completas + alineación al centro del segmento ganador).
// - El backend solo recibe `{ winner: { label, color } }`; el `finalAngle`
//   es local y se descarta antes de persistir el historial.
// =============================================================================

import type {
  RouletteInput,
  RouletteOption,
  RouletteResultBackend,
  RouletteResultLocal,
} from '../domain/contracts';
import type { DrawStrategy } from '../domain/contracts';
import { randomInt } from '../lib/mathUtils';

export interface RouletteSegment {
  label: string;
  color: string;
  startAngle: number;
  endAngle: number;
}

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

/**
 * Calcula el ángulo final del canvas.
 * - `currentRotation`: ángulo actual acumulado (en radianes, libre).
 * - `targetIndex`: índice del segmento ganador (0..N-1).
 * - `totalSegments`: N.
 * Suma 4–8 vueltas extra (1440°–2880°) más el offset al centro del segmento.
 */
export function generateSpinAngle(
  currentRotation: number,
  targetIndex: number,
  totalSegments: number,
): number {
  const extraTurns = randomInt(4, 8);
  const baseTurns = extraTurns * Math.PI * 2;
  const anglePerSegment = (Math.PI * 2) / totalSegments;
  // El puntero está arriba (en el frontend original, -π/2 en coords de canvas).
  // Para alinear el centro del segmento con el puntero, sumamos media rotación
  // menos el offset al centro del segmento objetivo.
  const segmentCenter = targetIndex * anglePerSegment + anglePerSegment / 2;
  const target = -Math.PI / 2 - segmentCenter;
  return currentRotation + baseTurns + target;
}

export class RouletteStrategy
  implements
    DrawStrategy<RouletteInput, RouletteResultLocal, RouletteResultBackend>
{
  readonly moduleId = 'roulette' as const;

  actionLabel(input: RouletteInput): string {
    return `Ruleta con ${input.options.length} opciones`;
  }

  buildPayload(input: RouletteInput): Record<string, unknown> {
    return {
      options: input.options.map((o) => ({ label: o.label, color: o.color })),
    };
  }

  execute(input: RouletteInput): {
    local: RouletteResultLocal;
    backend: RouletteResultBackend;
  } {
    if (input.options.length === 0) {
      throw new Error('Agrega al menos una opción para girar la ruleta.');
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

export const rouletteStrategy = new RouletteStrategy();