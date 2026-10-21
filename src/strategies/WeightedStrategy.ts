// =============================================================================
// WeightedStrategy — módulo `weighted`.
//
// Sortear un ganador con probabilidad proporcional al peso. Si `autoRemove`
// es true, devuelve también la lista restante para sorteos sin reposición.
// El backend solo recibe `{ winner, probability }`.
// =============================================================================

import type {
  WeightedEntry,
  WeightedInput,
  WeightedResultBackend,
  WeightedResultLocal,
} from '../domain/contracts';
import type { DrawExecution, DrawStrategy } from '../domain/contracts';
import { weightedRandom } from '../lib/mathUtils';

export interface WeightedBulkInvalidLine {
  line: string;
  reason: string;
}

export interface WeightedBulkResult {
  entries: WeightedEntry[];
  invalid: WeightedBulkInvalidLine[];
}

/**
 * Porcentajes por fila en décimas, con reparto de resto mayor para que la
 * suma visible sea exactamente 100.0.
 */
export function computeWeightedPercentages(
  entries: ReadonlyArray<WeightedEntry>,
): number[] {
  const total = entries.reduce((acc, entry) => acc + entry.weight, 0);
  if (total <= 0) {
    return entries.map(() => 0);
  }

  const exact = entries.map((entry) => (entry.weight / total) * 1000);
  const base = exact.map((value) => Math.floor(value));
  let remaining = 1000 - base.reduce((acc, value) => acc + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - base[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let i = 0; remaining > 0; i += 1, remaining -= 1) {
    base[order[i % order.length].index] += 1;
  }

  return base.map((value) => value / 10);
}

/**
 * Parsea la carga masiva: una persona por línea, con peso opcional.
 *
 * Formatos aceptados:
 *   `Ana`        → peso 1
 *   `Ana, 3`     → peso 3
 *
 * Las líneas vacías se ignoran. Las líneas inválidas se devuelven con el
 * motivo para que la pantalla las informe sin descartar las válidas.
 */
export function parseWeightedBulk(text: string): WeightedBulkResult {
  const entries: WeightedEntry[] = [];
  const invalid: WeightedBulkInvalidLine[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const commaIndex = line.lastIndexOf(',');
    const name = commaIndex === -1 ? line : line.slice(0, commaIndex).trim();
    const rawWeight = commaIndex === -1 ? '' : line.slice(commaIndex + 1).trim();

    if (!name) {
      invalid.push({ line, reason: 'Falta el nombre.' });
      continue;
    }

    let weight = 1;
    if (rawWeight !== '') {
      if (!/^\d+$/.test(rawWeight)) {
        invalid.push({
          line,
          reason: 'El peso debe ser un número entero entre 1 y 100.',
        });
        continue;
      }
      weight = Number(rawWeight);
      if (weight < 1 || weight > 100) {
        invalid.push({
          line,
          reason: 'El peso debe estar entre 1 y 100.',
        });
        continue;
      }
    }

    entries.push({ name, weight });
  }

  return { entries, invalid };
}

export class WeightedStrategy
  implements
    DrawStrategy<WeightedInput, WeightedResultLocal, WeightedResultBackend>
{
  readonly moduleId = 'weighted' as const;

  actionLabel(input: WeightedInput): string {
    return `Sorteo entre ${input.entries.length} participantes`;
  }

  buildPayload(input: WeightedInput): WeightedInput {
    return {
      entries: input.entries.map((e) => ({ name: e.name, weight: e.weight })),
      ...(input.autoRemove !== undefined ? { autoRemove: input.autoRemove } : {}),
    };
  }

  execute(input: WeightedInput): DrawExecution<WeightedResultLocal, WeightedResultBackend> {
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