/**
 * Math utility functions for randomization.
 * All functions are pure — no side effects, no mutation.
 */

/**
 * Fisher-Yates shuffle (Durstenfeld variant).
 * Returns a new array, never mutates the input.
 * @param {Array} array
 * @returns {Array}
 */
export const fisherYatesShuffle = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Random integer in [min, max] (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Weighted random selection using accumulated probability.
 * @param {Array<{name: string, weight: number}>} entries
 * @returns {{name: string, weight: number}} The selected entry
 */
export const weightedRandom = (entries) => {
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const entry of entries) {
    threshold -= entry.weight;
    if (threshold <= 0) return entry;
  }

  return entries[entries.length - 1];
};

/**
 * Generate N unique random integers in [min, max].
 * @param {number} count
 * @param {number} min
 * @param {number} max
 * @returns {number[]}
 * @throws {Error} If count exceeds available range
 */
export const uniqueRandomInts = (count, min, max) => {
  const range = max - min + 1;
  if (count > range) {
    throw new Error(
      `No se pueden generar ${count} números únicos en el rango [${min}, ${max}] (rango disponible: ${range})`
    );
  }

  const set = new Set();
  while (set.size < count) {
    set.add(randomInt(min, max));
  }

  return [...set];
};
