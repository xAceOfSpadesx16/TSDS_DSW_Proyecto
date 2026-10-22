import { describe, expect, it } from 'vitest';

import {
  PAPER_INK,
  PAPER_ON_ACTION,
  ROULETTE_PALETTE,
  accessibleSegment,
  contrastRatio,
  uniqueRouletteColor,
} from '../../../src/lib/palette';

describe('palette — contraste de la ruleta', () => {
  it('cada color de la paleta alcanza 4.5:1 con la etiqueta asignada', () => {
    for (const color of ROULETTE_PALETTE) {
      const segment = accessibleSegment(color);
      expect(
        contrastRatio(segment.fill, segment.label),
        `${color} con etiqueta ${segment.label}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('elige tinta oscura sobre fondos claros', () => {
    const segment = accessibleSegment('#f8fbff');
    expect(segment.label).toBe(PAPER_INK);
    expect(contrastRatio(segment.fill, segment.label)).toBeGreaterThanOrEqual(4.5);
  });

  it('oscurece un gris intermedio cuando ningún texto alcanza 4.5:1', () => {
    const segment = accessibleSegment('#777777');
    expect(segment.label).toBe(PAPER_ON_ACTION);
    expect(segment.fill).not.toBe('#777777');
    expect(contrastRatio(segment.fill, segment.label)).toBeGreaterThanOrEqual(4.5);
  });

  it('usa la primera opción de la paleta ante un color inválido', () => {
    const segment = accessibleSegment('no-es-un-color');
    expect(segment.fill).toBe(ROULETTE_PALETTE[0]);
    expect(contrastRatio(segment.fill, segment.label)).toBeGreaterThanOrEqual(4.5);
  });

  it('genera colores únicos y accesibles cuando se agota la paleta', () => {
    const used = new Set(ROULETTE_PALETTE.map((color) => color.toLowerCase()));
    for (let index = 0; index < 24; index += 1) {
      const color = uniqueRouletteColor(used, ROULETTE_PALETTE[0]);
      expect(used.has(color.toLowerCase())).toBe(false);
      expect(contrastRatio(color, PAPER_ON_ACTION)).toBeGreaterThanOrEqual(4.5);
      used.add(color.toLowerCase());
    }
    expect(used.size).toBe(ROULETTE_PALETTE.length + 24);
  });
});
