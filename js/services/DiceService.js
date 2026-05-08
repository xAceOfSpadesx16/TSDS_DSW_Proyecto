/**
 * DiceService — RPG dice rolling and number generation.
 */
import { randomInt, uniqueRandomInts } from '../utils/mathUtils.js';

export class DiceService {
  /**
   * Roll a single die.
   * @param {number} sides
   * @param {number} modifier
   * @returns {{ rolls: number[], modifier: number, total: number }}
   */
  rollDice(sides, modifier = 0) {
    const roll = randomInt(1, sides);
    return {
      rolls: [roll],
      modifier,
      total: roll + modifier
    };
  }

  /**
   * Parse and roll a dice formula like "2d6+3".
   * @param {string} formula
   * @returns {{ rolls: number[], modifier: number, total: number, formula: string }}
   */
  rollMultiple(formula) {
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) {
      throw new Error(`Fórmula inválida: "${formula}". Usa formato NdS (ej. 2d6+3).`);
    }

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    const rolls = Array.from({ length: count }, () => randomInt(1, sides));
    const sum = rolls.reduce((a, b) => a + b, 0);

    return {
      rolls,
      modifier,
      total: sum + modifier,
      formula
    };
  }

  /**
   * Generate unique random numbers in a range.
   * @param {number} count
   * @param {number} min
   * @param {number} max
   * @returns {number[]}
   */
  generateUniqueNumbers(count, min, max) {
    return uniqueRandomInts(count, min, max).sort((a, b) => a - b);
  }

  /**
   * Generate random numbers (with possible repeats).
   * @param {number} count
   * @param {number} min
   * @param {number} max
   * @returns {number[]}
   */
  generateNumbers(count, min, max) {
    return Array.from({ length: count }, () => randomInt(min, max)).sort((a, b) => a - b);
  }
}
