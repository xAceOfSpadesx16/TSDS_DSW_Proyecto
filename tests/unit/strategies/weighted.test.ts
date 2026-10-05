// =============================================================================
// Unit tests — src/strategies/WeightedStrategy.ts. PLAN 4.2.
// =============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import { WeightedStrategy } from '../../../src/strategies/WeightedStrategy';

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
