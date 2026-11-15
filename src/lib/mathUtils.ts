/** Utilidades matemáticas puras usadas por las estrategias de sorteo. */

/** Devuelve una copia barajada con Fisher–Yates. */
export function fisherYatesShuffle<T>(input: readonly T[]): T[] {
  const array = input.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Entero aleatorio en [min, max]. */
export function randomInt(min: number, max: number): number {
  if (max < min) {
    throw new Error(`randomInt: max (${max}) debe ser >= min (${min})`);
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Baraja el arreglo recibido y devuelve la misma referencia. */
export function shuffleInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Entrada con nombre y peso para el sorteo ponderado. */
export interface WeightedEntry {
  name: string;
  weight: number;
}

/** Elige un ganador con probabilidad proporcional al peso. */
export function weightedRandom(entries: readonly WeightedEntry[]): WeightedEntry {
  const totalWeight = entries.reduce((acc, e) => acc + e.weight, 0);
  if (totalWeight <= 0) {
    throw new Error('weightedRandom: la suma de pesos debe ser > 0');
  }
  const target = Math.random() * totalWeight;
  let accumulator = 0;
  for (const entry of entries) {
    accumulator += entry.weight;
    if (target < accumulator) {
      return entry;
    }
  }
  return entries[entries.length - 1];
}

/** Genera `count` enteros únicos en [min, max], ordenados. */
export function uniqueRandomInts(count: number, min: number, max: number): number[] {
  if (count < 1) {
    throw new Error('uniqueRandomInts: count debe ser >= 1');
  }
  const range = max - min + 1;
  if (count > range) {
    throw new Error(
      `No se pueden generar ${count} números únicos en el rango [${min}, ${max}] ` +
        `(rango disponible: ${range})`,
    );
  }
  const taken = new Set<number>();
  const out: number[] = [];
  while (out.length < count) {
    const candidate = randomInt(min, max);
    if (!taken.has(candidate)) {
      taken.add(candidate);
      out.push(candidate);
    }
  }
  return out.sort((a, b) => a - b);
}
