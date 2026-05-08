/**
 * RouletteService — Segment calculation and spin physics.
 */
import { randomInt } from '../utils/mathUtils.js';

export class RouletteService {
  /**
   * Calculate segment data for drawing.
   * @param {Array<{label: string, color: string}>} items
   * @returns {Array<{label: string, color: string, startAngle: number, endAngle: number}>}
   */
  calculateSegments(items) {
    const anglePerItem = (2 * Math.PI) / items.length;
    return items.map((item, i) => ({
      ...item,
      startAngle: i * anglePerItem,
      endAngle: (i + 1) * anglePerItem
    }));
  }

  /**
   * Generate final spin angle for a target segment.
   * @param {number} currentRotation - Current rotation in degrees
   * @param {number} targetIndex - Index of the winning segment
   * @param {number} totalSegments
   * @returns {{ finalAngle: number, targetLabel: string }}
   */
  generateSpinAngle(currentRotation, targetIndex, totalSegments) {
    const segmentAngle = 360 / totalSegments;
    const targetCenter = targetIndex * segmentAngle + segmentAngle / 2;

    const pointerAngle = 270;
    const stopAngle = pointerAngle - targetCenter;
    const extraSpins = (randomInt(4, 8)) * 360;
    const normalized = ((stopAngle % 360) + 360) % 360;
    const finalAngle = currentRotation + extraSpins + normalized - (currentRotation % 360);

    return { finalAngle };
  }
}
