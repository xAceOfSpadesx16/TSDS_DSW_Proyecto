// =============================================================================
// Unit tests — src/strategies/NumbersStrategy.ts. PLAN 4.2.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { NumbersStrategy } from '../../../src/strategies/NumbersStrategy';

describe('NumbersStrategy', () => {
  it('moduleId === "numbers"', () => {
    expect(new NumbersStrategy().moduleId).toBe('numbers');
  });

  describe('actionLabel', () => {
    it('sufijo (únicos) cuando unique=true', () => {
      expect(
        new NumbersStrategy().actionLabel({
          count: 5,
          min: 1,
          max: 10,
          unique: true,
        }),
      ).toContain('(únicos)');
    });

    it('sufijo (con repetición) cuando unique=false', () => {
      expect(
        new NumbersStrategy().actionLabel({
          count: 5,
          min: 1,
          max: 10,
          unique: false,
        }),
      ).toContain('(con repetición)');
    });
  });

  describe('buildPayload', () => {
    it('incluye count, min, max y unique', () => {
      const p = new NumbersStrategy().buildPayload({
        count: 3,
        min: 1,
        max: 6,
        unique: true,
      });
      expect(p.count).toBe(3);
      expect(p.min).toBe(1);
      expect(p.max).toBe(6);
      expect(p.unique).toBe(true);
    });
  });

  describe('validaciones', () => {
    it('lanza cuando count < 1', () => {
      expect(() =>
        new NumbersStrategy().execute({
          count: 0,
          min: 1,
          max: 5,
          unique: false,
        }),
      ).toThrow(/>= 1/);
    });

    it('lanza cuando max < min', () => {
      expect(() =>
        new NumbersStrategy().execute({
          count: 3,
          min: 5,
          max: 1,
          unique: false,
        }),
      ).toThrow(/debe ser >= mínimo/);
    });

    it('lanza cuando unique y count supera el rango', () => {
      expect(() =>
        new NumbersStrategy().execute({
          count: 5,
          min: 1,
          max: 3,
          unique: true,
        }),
      ).toThrow(
        'No se pueden generar 5 números únicos en el rango [1, 3] (rango disponible: 3)',
      );
    });
  });

  describe('execute con unicidad', () => {
    it('no repetidos y ordenados ascendente', () => {
      const { local } = new NumbersStrategy().execute({
        count: 6,
        min: 1,
        max: 40,
        unique: true,
      });
      expect(local.numbers).toHaveLength(6);
      expect(new Set(local.numbers).size).toBe(6);
      expect(local.numbers).toEqual(
        [...local.numbers].sort((a, b) => a - b),
      );
    });
  });

  describe('execute con repetición', () => {
    it('genera count números en el rango, ordenados', () => {
      const { local } = new NumbersStrategy().execute({
        count: 4,
        min: 1,
        max: 6,
        unique: false,
      });
      expect(local.numbers).toHaveLength(4);
      expect(local.numbers).toEqual(
        [...local.numbers].sort((a, b) => a - b),
      );
      local.numbers.forEach((n) => {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(6);
      });
    });
  });
});
