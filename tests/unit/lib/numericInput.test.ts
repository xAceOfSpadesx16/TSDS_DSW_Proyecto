// =============================================================================
// Unit tests — src/lib/numericInput.ts (PLAN v3 fase 1).
//
// Los helpers existen para que los inputs numéricos puedan quedar vacíos
// mientras se editan: el mínimo entra al salir del campo o al enviar, nunca
// en cada tecla (si no, al borrar saltaría al mínimo y al tipear el valor se
// concatenaría: "1" + "5" = 15).
// =============================================================================

import { describe, expect, it } from 'vitest';

import {
  clampMin,
  readNumeric,
  toNumberOr,
  type NumericInput,
} from '../../../src/lib/numericInput';

describe('readNumeric', () => {
  it('convierte un string numérico a number', () => {
    expect(readNumeric('5')).toBe(5);
    expect(readNumeric('0')).toBe(0);
    expect(readNumeric('-3')).toBe(-3);
    expect(readNumeric('2.5')).toBe(2.5);
  });

  it('devuelve el string vacío tal cual, sin convertirlo a 0', () => {
    // La diferencia con `Number('')` (que da 0) es justamente lo que
    // permite distinguir "el usuario borró el campo" de "puso 0".
    expect(readNumeric('')).toBe('');
  });

  it('devuelve NaN para texto no numérico (no lanza)', () => {
    expect(readNumeric('abc')).toBeNaN();
  });
});

describe('clampMin', () => {
  it('deja el valor si ya cumple el mínimo', () => {
    expect(clampMin(5, 1)).toBe(5);
    expect(clampMin(1, 1)).toBe(1);
    expect(clampMin(100, 1)).toBe(100);
  });

  it('eleva al mínimo los valores por debajo', () => {
    expect(clampMin(0, 1)).toBe(1);
    expect(clampMin(-5, 1)).toBe(1);
  });

  it('resuelve el vacío al mínimo', () => {
    expect(clampMin('', 1)).toBe(1);
    expect(clampMin('', 2)).toBe(2);
    expect(clampMin('', 0)).toBe(0);
  });

  it('acepta mínimos negativos', () => {
    expect(clampMin('', -3)).toBe(-3);
    expect(clampMin(-1, -3)).toBe(-1);
    expect(clampMin(-5, -3)).toBe(-3);
  });
});

describe('toNumberOr', () => {
  it('devuelve el número cuando hay valor', () => {
    expect(toNumberOr(5)).toBe(5);
    expect(toNumberOr(0)).toBe(0);
  });

  it('resuelve el vacío al fallback (0 por defecto)', () => {
    expect(toNumberOr('')).toBe(0);
  });

  it('acepta un fallback explícito', () => {
    expect(toNumberOr('', 10)).toBe(10);
    expect(toNumberOr(7, 10)).toBe(7);
  });
});

describe('NumericInput', () => {
  it('el tipo admite number y el string vacío', () => {
    // Prueba de tipos: las dos variantes del alias compilan.
    const conValor: NumericInput = 5;
    const vacio: NumericInput = '';
    expect(conValor).toBe(5);
    expect(vacio).toBe('');
  });
});
