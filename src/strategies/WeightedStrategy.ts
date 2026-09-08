// =============================================================================
// WeightedStrategy — módulo `weighted`.
//
// Sortea un ganador con probabilidad proporcional al peso. Si `autoRemove`
// es true, devuelve también la lista restante para sorteos sin reposición.
// El backend solo recibe `{ winner, probability }`.
// =============================================================================

import type {
  WeightedEntry,
  WeightedInput,
  WeightedResultBackend,
  WeightedResultLocal,
} from '../domain/contracts';
import type { DrawStrategy } from '../domain/contracts';
import { weightedRandom } from '../lib/mathUtils';

export class WeightedStrategy
  implements
    DrawStrategy<WeightedInput, WeightedResultLocal, WeightedResultBackend>
{
  readonly moduleId = 'weighted' as const;

  actionLabel(input: WeightedInput): string {
    return `Sorteo entre ${input.entries.length} participantes`;
  }

  buildPayload(input: WeightedInput): Record<string, unknown> {
    return {
      entries: input.entries.map((e) => ({ name: e.name, weight: e.weight })),
      ...(input.autoRemove !== undefined ? { autoRemove: input.autoRemove } : {}),
    };
  }

  execute(input: WeightedInput): {
    local: WeightedResultLocal;
    backend: WeightedResultBackend;
  } {
    if (input.entries.length === 0) {
      throw new Error('No hay participantes para sortear.');
    }
    for (const entry of input.entries) {
      if (!entry.name.trim()) {
        throw new Error('Todos los participantes deben tener nombre.');
      }
      if (entry.weight <= 0) {
        throw new Error(`El peso de "${entry.name}" debe ser > 0.`);
      }
    }

    const winner = weightedRandom(input.entries);
    const totalWeight = input.entries.reduce((acc, e) => acc + e.weight, 0);
    const probability = Math.round((winner.weight / totalWeight) * 10000) / 100;

    const remainingEntries = input.autoRemove
      ? input.entries.filter((e) => e !== winner)
      : input.entries.slice();

    return {
      local: { winner, probability, remainingEntries },
      backend: { winner, probability },
    };
  }
}

export const weightedStrategy = new WeightedStrategy();

// Re-export del tipo público para evitar imports redundantes en consumidores.
export type { WeightedEntry };