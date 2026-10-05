// =============================================================================
// Unit tests — src/strategies/DiceStrategy.ts. PLAN 4.2.
// =============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import { DiceStrategy } from '../../../src/strategies/DiceStrategy';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiceStrategy', () => {
  it('moduleId === "dice"', () => {
    expect(new DiceStrategy().moduleId).toBe('dice');
  });

  describe('actionLabel', () => {
    it('sin modificador: d6 / d20', () => {
      const s = new DiceStrategy();
      expect(s.actionLabel({ sides: 6, modifier: 0 })).toBe('d6');
      expect(s.actionLabel({ sides: 20, modifier: 0 })).toBe('d20');
    });

    it('modificador positivo: d20+5', () => {
      expect(new DiceStrategy().actionLabel({ sides: 20, modifier: 5 })).toBe(
        'd20+5',
      );
    });

    it('modificador negativo: d8-2', () => {
      expect(new DiceStrategy().actionLabel({ sides: 8, modifier: -2 })).toBe(
        'd8-2',
      );
    });

    it('fórmula en minúsculas', () => {
      expect(
        new DiceStrategy().actionLabel({
          sides: 6,
          modifier: 3,
          formula: '2D6+3',
        }),
      ).toBe('2d6+3');
    });
  });

  describe('buildPayload', () => {
    it('incluye sides y modifier', () => {
      const p = new DiceStrategy().buildPayload({ sides: 6, modifier: 0 });
      expect(p.sides).toBe(6);
      expect(p.modifier).toBe(0);
    });

    it('incluye count y formula solo cuando están presentes', () => {
      const withExtras = new DiceStrategy().buildPayload({
        sides: 6,
        modifier: 0,
        count: 3,
        formula: '2d6',
      });
      expect(withExtras.count).toBe(3);
      expect(withExtras.formula).toBe('2d6');

      const base = new DiceStrategy().buildPayload({ sides: 6, modifier: 0 });
      expect('count' in base).toBe(false);
      expect('formula' in base).toBe(false);
    });
  });

  describe('execute simple', () => {
    it('cada tirada en 1..sides y total = suma de tiradas + modificador', () => {
      // randomInt(1,6) = floor(random*6)+1 → [0.4,0.7,0.25] => [3,5,2]
      const rnd = [0.4, 0.7, 0.25];
      let i = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => rnd[i++ % rnd.length]);

      const { local, backend } = new DiceStrategy().execute({
        sides: 6,
        modifier: 0,
        count: 3,
      });

      expect(local.rolls).toEqual([3, 5, 2]);
      expect(local.total).toBe(10);
      expect(local.modifier).toBe(0);
      expect(local).toEqual(backend); // local y backend coinciden
    });

    it('lanza si las caras son < 2', () => {
      expect(() =>
        new DiceStrategy().execute({ sides: 1, modifier: 0 }),
      ).toThrow(/al menos 2 caras/);
    });
  });

  describe('execute con fórmula RPG', () => {
    it('parses NdS+M y suma tiradas + modificador', () => {
      // 2d6+3 → [0.55,0.1] => [4,1] → total 4+1+3 = 8
      const rnd = [0.55, 0.1];
      let i = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => rnd[i++ % rnd.length]);

      const { local } = new DiceStrategy().execute({
        sides: 6,
        modifier: 0,
        formula: '2d6+3',
      });

      expect(local.rolls).toEqual([4, 1]);
      expect(local.modifier).toBe(3);
      expect(local.total).toBe(8);
      expect(local.formula).toBe('2d6+3');
    });

    it('lanza con fórmula inválida', () => {
      expect(() =>
        new DiceStrategy().execute({ sides: 6, modifier: 0, formula: 'abc' }),
      ).toThrow(/Fórmula inválida/);
    });

    it('fórmula sin modificador: 2d6', () => {
      // 2d6 → [0.4,0.7] => [3,5] → total 8, modificador 0.
      const rnd = [0.4, 0.7];
      let i = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => rnd[i++ % rnd.length]);

      const { local } = new DiceStrategy().execute({
        sides: 6,
        modifier: 0,
        formula: '2d6',
      });

      expect(local.rolls).toEqual([3, 5]);
      expect(local.modifier).toBe(0);
      expect(local.total).toBe(8);
      expect(local.formula).toBe('2d6');
    });

    it('parses NdS-M con modificador negativo y lo aplica al total', () => {
      // 2d6-2 → [0.55,0.1] => [4,1] → total 4+1-2 = 3
      const rnd = [0.55, 0.1];
      let i = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => rnd[i++ % rnd.length]);

      const { local } = new DiceStrategy().execute({
        sides: 6,
        modifier: 0,
        formula: '2d6-2',
      });

      expect(local.rolls).toEqual([4, 1]);
      expect(local.modifier).toBe(-2);
      expect(local.total).toBe(3);
      expect(local.formula).toBe('2d6-2');
    });
  });
});
