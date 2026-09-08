// =============================================================================
// Utilidades matemáticas puras.
//
// Equivalentes en TS estricto de `js/utils/mathUtils.js`. Usadas por las
// estrategias de sorteo. Mantener sin efectos secundarios: deben poder
// ejecutarse indistintamente en cliente y servidor (test-friendly).
// =============================================================================

/**
 * Fisher–Yates moderno. Devuelve un NUEVO array; el original queda intacto.
 */
export function fisherYatesShuffle<T>(input: readonly T[]): T[] {
  const array = input.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Entero aleatorio en [min, max] (ambos inclusive). */
export function randomInt(min: number, max: number): number {
  if (max < min) {
    throw new Error(`randomInt: max (${max}) debe ser >= min (${min})`);
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Baraja in-place. Alias explícito para indicar mutación cuando se quiere. */
export function shuffleInPlace<T>(array: T[]): T[] {
  return fisherYatesShuffle(array);
}

export interface WeightedEntry {
  name: string;
  weight: number;
}

/**
 * Selección por probabilidad acumulada (un único ganador).
 * `entries` con peso > 0; la suma de pesos no necesita ser 1.
 * Si la entrada cae exactamente en el borde, se devuelve la última.
 */
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
  // Fallback por redondeo en el borde superior.
  return entries[entries.length - 1];
}

/**
 * Genera `count` enteros únicos en [min, max].
 * Lanza si el rango disponible es insuficiente.
 */
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
  // Selección sin rechazo: marcar números ya tomados en un Set y
  // samplear hasta completar `count`. Para `count << range` es O(count).
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