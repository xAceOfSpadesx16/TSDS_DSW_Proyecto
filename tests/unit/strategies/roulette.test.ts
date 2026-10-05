// =============================================================================
// Unit tests — src/strategies/RouletteStrategy.ts. PLAN 4.2.
// =============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  RouletteStrategy,
  calculateSegments,
  generateSpinAngle,
} from '../../../src/strategies/RouletteStrategy';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('calculateSegments', () => {
  it('lanza si la lista está vacía', () => {
    expect(() => calculateSegments([])).toThrow(/al menos una opción/);
  });

  it('divide equitativamente sumando 2pi en total', () => {
    const segs = calculateSegments([
      { label: 'a', color: '#1' },
      { label: 'b', color: '#2' },
      { label: 'c', color: '#3' },
    ]);
    expect(segs).toHaveLength(3);
    const total = segs.reduce((acc, s) => acc + (s.endAngle - s.startAngle), 0);
    expect(total).toBeCloseTo(Math.PI * 2, 10);
  });

  it('asigna ángulos iniciales y finales correctos', () => {
    const segs = calculateSegments([
      { label: 'a', color: '#1' },
      { label: 'b', color: '#2' },
    ]);
    expect(segs[0].startAngle).toBe(0);
    expect(segs[0].endAngle).toBeCloseTo(Math.PI, 10);
    expect(segs[1].startAngle).toBeCloseTo(Math.PI, 10);
    expect(segs[1].endAngle).toBeCloseTo(Math.PI * 2, 10);
  });
});

describe('generateSpinAngle', () => {
  it('suma 4-8 vueltas y alinea el centro del segmento al puntero -π/2', () => {
    const totalSegments = 4;
    const targetIndex = 1;
    const anglePerSegment = (Math.PI * 2) / totalSegments;
    const segmentCenter = targetIndex * anglePerSegment + anglePerSegment / 2;
    const pointer = -Math.PI / 2 - segmentCenter;

    const result = generateSpinAngle(0, targetIndex, totalSegments);
    const baseTurns = result - pointer; // lo acumulado menos el offset del puntero
    const turns = baseTurns / (Math.PI * 2);

    expect(turns).toBeGreaterThanOrEqual(4);
    expect(turns).toBeLessThanOrEqual(8);
    expect(Number.isInteger(turns)).toBe(true);
  });

  it('acumula sobre el ángulo de rotación previo', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // extraTurns determinista
    const a = generateSpinAngle(0, 0, 3);
    const b = generateSpinAngle(100, 0, 3);
    // La rotación base es idéntica; la diferencia es solo el offset inicial.
    expect(b - a).toBeCloseTo(100, 5);
  });
});

describe('RouletteStrategy', () => {
  it('moduleId === "roulette"', () => {
    expect(new RouletteStrategy().moduleId).toBe('roulette');
  });

  describe('actionLabel', () => {
    it('incluye la cantidad de opciones', () => {
      expect(
        new RouletteStrategy().actionLabel({
          options: [
            { label: 'a', color: '#1' },
            { label: 'b', color: '#2' },
          ],
        }),
      ).toContain('2');
    });
  });

  describe('buildPayload', () => {
    it('mapea solo label y color', () => {
      const options = [
        { label: 'a', color: '#1' },
        { label: 'b', color: '#2' },
      ];
      const p = new RouletteStrategy().buildPayload({ options });
      expect(p.options).toEqual([
        { label: 'a', color: '#1' },
        { label: 'b', color: '#2' },
      ]);
    });
  });

  describe('execute', () => {
    it('lanza si no hay opciones', () => {
      expect(() =>
        new RouletteStrategy().execute({ options: [] }),
      ).toThrow(/al menos una opción/);
    });

    it('elige un ganador dentro del set y separa local de backend', () => {
      const options = [
        { label: 'a', color: '#1' },
        { label: 'b', color: '#2' },
        { label: 'c', color: '#3' },
      ];
      const { local, backend } = new RouletteStrategy().execute({ options });

      expect(options).toContain(local.winner);
      expect(options).toContain(backend.winner);
      expect(local).toHaveProperty('finalAngle');
      expect(Object.keys(backend)).toEqual(['winner']);
    });
  });
});
