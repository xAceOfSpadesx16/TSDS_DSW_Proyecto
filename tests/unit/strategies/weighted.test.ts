// =============================================================================
// Unit tests — src/strategies/WeightedStrategy.ts. PLAN 4.2.
// =============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  WeightedStrategy,
  computeWeightedPercentages,
  parseWeightedBulk,
} from '../../../src/strategies/WeightedStrategy';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WeightedStrategy', () => {
  it('moduleId === "weighted"', () => {
    expect(new WeightedStrategy().moduleId).toBe('weighted');
  });

  describe('buildPayload', () => {
    it('mapea name y weight de cada entrada', () => {
      const entries = [
        { name: 'a', weight: 1 },
        { name: 'b', weight: 2 },
      ];
      const p = new WeightedStrategy().buildPayload({ entries });
      expect(p.entries).toEqual([
        { name: 'a', weight: 1 },
        { name: 'b', weight: 2 },
      ]);
    });

    it('incluye autoRemove solo cuando se indica', () => {
      const withFlag = new WeightedStrategy().buildPayload({
        entries: [{ name: 'a', weight: 1 }],
        autoRemove: true,
      });
      expect(withFlag.autoRemove).toBe(true);

      const without = new WeightedStrategy().buildPayload({
        entries: [{ name: 'a', weight: 1 }],
      });
      expect('autoRemove' in without).toBe(false);
    });
  });

  describe('actionLabel', () => {
    it('incluye el número de participantes', () => {
      expect(
        new WeightedStrategy().actionLabel({
          entries: [
            { name: 'a', weight: 1 },
            { name: 'b', weight: 2 },
            { name: 'c', weight: 3 },
          ],
        }),
      ).toContain('3');
    });
  });

  describe('validaciones', () => {
    it('lanza sin participantes', () => {
      expect(() =>
        new WeightedStrategy().execute({ entries: [] }),
      ).toThrow(/sin participantes|No hay participantes/);
    });

    it('lanza con nombre vacío o en blanco', () => {
      expect(() =>
        new WeightedStrategy().execute({
          entries: [{ name: '   ', weight: 1 }],
        }),
      ).toThrow(/deben tener nombre/);
    });

    it('lanza con peso <= 0', () => {
      expect(() =>
        new WeightedStrategy().execute({
          entries: [{ name: 'a', weight: 0 }],
        }),
      ).toThrow(/debe ser > 0/);
    });
  });

  describe('cálculo de probabilidad', () => {
    it('(peso / total) * 100 con dos decimales', () => {
      // Math.random() = 0.5 → target = 2.0 → gana 'b' (peso 3 de 4).
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { local } = new WeightedStrategy().execute({
        entries: [
          { name: 'a', weight: 1 },
          { name: 'b', weight: 3 },
        ],
      });
      expect(local.winner.name).toBe('b');
      expect(local.probability).toBe(75);
    });
  });

  describe('auto-remoción', () => {
    it('true: retira el ganador de la lista restante', () => {
      const entries = [
        { name: 'a', weight: 1 },
        { name: 'b', weight: 1 },
        { name: 'c', weight: 1 },
      ];
      const { local } = new WeightedStrategy().execute({
        entries,
        autoRemove: true,
      });
      expect(local.remainingEntries).not.toContain(local.winner);
      expect(local.remainingEntries).toHaveLength(2);
    });

    it('false: mantiene la totalidad de participantes', () => {
      const entries = [
        { name: 'a', weight: 1 },
        { name: 'b', weight: 2 },
      ];
      const { local } = new WeightedStrategy().execute({
        entries,
        autoRemove: false,
      });
      expect(local.remainingEntries).toEqual(entries);
    });
  });

  describe('carga masiva', () => {
    it('parsea nombre y peso opcional, e informa líneas inválidas', () => {
      const result = parseWeightedBulk(
        'Ana, 3\n\nBruno, mal\nCarla\nDiego, 200\nEva, 5',
      );
      expect(result.entries).toEqual([
        { name: 'Ana', weight: 3 },
        { name: 'Carla', weight: 1 },
        { name: 'Eva', weight: 5 },
      ]);
      expect(result.invalid.map((item) => item.line)).toEqual([
        'Bruno, mal',
        'Diego, 200',
      ]);
    });

    it('ignora líneas vacías y acepta nombres con coma', () => {
      const result = parseWeightedBulk('  \nAna, María, 4\n\n');
      expect(result.entries).toEqual([{ name: 'Ana, María', weight: 4 }]);
      expect(result.invalid).toEqual([]);
    });
  });

  describe('porcentajes por fila', () => {
    it('reparte 30/70 y suma 100', () => {
      const percentages = computeWeightedPercentages([
        { name: 'a', weight: 3 },
        { name: 'b', weight: 7 },
      ]);
      expect(percentages).toEqual([30, 70]);
      expect(percentages.reduce((acc, value) => acc + value, 0)).toBeCloseTo(100, 5);
    });

    it('reparte el resto para que tres pesos iguales sumen 100', () => {
      const percentages = computeWeightedPercentages([
        { name: 'a', weight: 1 },
        { name: 'b', weight: 1 },
        { name: 'c', weight: 1 },
      ]);
      expect(percentages.reduce((acc, value) => acc + value, 0)).toBeCloseTo(100, 5);
      expect(percentages[0]).toBe(33.4);
    });

    it('devuelve ceros sin participantes', () => {
      expect(computeWeightedPercentages([])).toEqual([]);
    });
  });

  describe('resultado backend', () => {
    it('contiene estrictamente winner y probability', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { backend } = new WeightedStrategy().execute({
        entries: [
          { name: 'a', weight: 1 },
          { name: 'b', weight: 3 },
        ],
      });
      expect(Object.keys(backend).sort()).toEqual(['probability', 'winner']);
    });
  });
});
