import { describe, expect, it } from 'vitest';

import {
  PAPER_INK,
  PAPER_ON_ACTION,
  ROULETTE_PALETTE,
  TEAM_PALETTE,
  accessibleSegment,
  contrastRatio,
  uniqueRouletteColor,
} from '../../../src/lib/palette';

function hue(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  if (delta === 0) return 0;
  const sector =
    max === red
      ? ((green - blue) / delta) % 6
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  return (sector * 60 + 360) % 360;
}

function hueDistance(a: string, b: string): number {
  const difference = Math.abs(hue(a) - hue(b));
  return Math.min(difference, 360 - difference);
}

describe('palette — contraste de la ruleta', () => {
  it('cada color base alcanza 4.5:1 con el texto claro', () => {
    for (const color of TEAM_PALETTE) {
      expect(
        contrastRatio(color, PAPER_ON_ACTION),
        `${color} sobre papel`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('las dos primeras opciones y equipos usan familias distintas', () => {
    expect(
      hueDistance(ROULETTE_PALETTE[0], ROULETTE_PALETTE[1]),
    ).toBeGreaterThanOrEqual(60);
    expect(
      hueDistance(TEAM_PALETTE[0], TEAM_PALETTE[1]),
    ).toBeGreaterThanOrEqual(60);
  });

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
