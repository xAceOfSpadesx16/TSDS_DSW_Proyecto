/**
 * WeightedDrawService — Weighted random selection with immutable state.
 */
import { weightedRandom } from '../utils/mathUtils.js';

export class WeightedDrawService {
  /**
   * Perform a weighted draw.
   * @param {Array<{name: string, weight: number}>} entries
   * @param {{ autoRemove: boolean }} options
   * @returns {{ winner: {name: string, weight: number}, remainingEntries: Array, probability: number }}
   */
  draw(entries, { autoRemove = false } = {}) {
    if (!entries.length) {
      throw new Error('No hay participantes para sortear.');
    }

    const winner = weightedRandom(entries);
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    const probability = winner.weight / totalWeight;

    let remainingEntries = entries;
    if (autoRemove) {
      const idx = entries.findIndex((e) => e === winner);
      remainingEntries = [...entries.slice(0, idx), ...entries.slice(idx + 1)];
    }

    return {
      winner,
      remainingEntries,
      probability: Math.round(probability * 10000) / 100
    };
  }
}
