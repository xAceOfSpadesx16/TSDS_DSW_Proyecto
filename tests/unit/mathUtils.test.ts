// =============================================================================
// Unit tests — src/lib/mathUtils.ts (PLAN 4.1).
// =============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fisherYatesShuffle,
  randomInt,
  shuffleInPlace,
  weightedRandom,
  uniqueRandomInts,
} from '../../src/lib/mathUtils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fisherYatesShuffle', () => {
  it('devuelve un NUEVO array (no muta el original)', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = fisherYatesShuffle(original);
    expect(shuffled).not.toBe(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it('conserva los mismos elementos y frecuencias', () => {
    const original = [1, 2, 3, 4, 5];
    expect((fisherYatesShuffle(original).sort((a, b) => a - b))).toEqual([1, 2, 3, 4, 5]);
  });

  it('maneja un arreglo vacío devolviendo un nuevo array vacío', () => {
    const original: never[] = [];
    const result = fisherYatesShuffle(original);
    expect(result).toEqual([]);
    // Nueva referencia: distinta de la del original (no muta la entrada).
    expect(result).not.toBe(original);
  });

  it('devuelve un arreglo idéntico con un solo elemento', () => {
    expect(fisherYatesShuffle([42])).toEqual([42]);
  });

  it('conserva elementos duplicados', () => {
    const original = [1, 1, 2, 2, 2];
    expect(fisherYatesShuffle(original).sort((a, b) => a - b)).toEqual([1, 1, 2, 2, 2]);
  });

  it('produce distintos órdenes al repetir (dispersión)', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 50; i++) {
      orders.add(fisherYatesShuffle([1, 2, 3, 4, 5]).join(','));
    }
    expect(orders.size).toBeGreaterThan(10);
  });
});

describe('randomInt', () => {
  it('alcanza los límites inclusivos min y max', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.999);
    expect(randomInt(1, 6)).toBe(1); // borde inferior
    expect(randomInt(1, 6)).toBe(6); // borde superior
  });

  it('nunca sale del rango [min, max]', () => {
    const values = [0, 0.1, 0.33, 0.5, 0.75, 0.999];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % values.length]);
    for (let j = 0; j < 200; j++) {
      const v = randomInt(-10, 10);
      expect(v).toBeGreaterThanOrEqual(-10);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('intervalo de un solo punto (min === max) siempre devuelve ese número', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(randomInt(7, 7)).toBe(7);
  });

  it('soporta rangos con enteros negativos', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(randomInt(-10, -1)).toBe(-10);
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(randomInt(-10, -1)).toBe(-1);
  });

  it('lanza cuando max < min con mensaje descriptivo', () => {
    expect(() => randomInt(10, 1)).toThrow(
      'randomInt: max (1) debe ser >= min (10)',
    );
  });
});

describe('shuffleInPlace', () => {
  it('muta el arreglo en su lugar y devuelve la misma referencia', () => {
    const original = [1, 2, 3, 4];
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = shuffleInPlace(original);
    // Misma referencia: mutación in-place real (no `.slice()`).
    expect(result).toBe(original);
    // Misma multiset de elementos...
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    // ...pero en otro orden que el original.
    expect(original).not.toEqual([1, 2, 3, 4]);
  });
});

describe('weightedRandom', () => {
  it('selecciona en proporción al peso (peso 99 vs 1)', () => {
    const entries = [
      { name: 'ligero', weight: 1 },
      { name: 'pesado', weight: 99 },
    ];
    // Espías deterministas para los límites superior e inferior del muestreo.
    // Límite inferior: target ≈ 0 → cae en la entrada más ligera.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(weightedRandom(entries).name).toBe('ligero');
    // Límite superior: target === totalWeight → cae en la última entrada.
    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(weightedRandom(entries).name).toBe('pesado');
  });

  it('devuelve siempre el único elemento cuando hay uno solo', () => {
    expect(weightedRandom([{ name: 'solo', weight: 5 }])).toEqual({
      name: 'solo',
      weight: 5,
    });
  });

  it('lanza cuando la suma de pesos <= 0', () => {
    expect(() => weightedRandom([{ name: 'a', weight: 0 }, { name: 'b', weight: 0 }])).toThrow(
      'weightedRandom: la suma de pesos debe ser > 0',
    );
    expect(() => weightedRandom([{ name: 'a', weight: 1 }, { name: 'b', weight: -2 }])).toThrow();
  });

  it('devuelve la última opción al caer exactamente en el borde superior', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1); // target === totalWeight
    const entries = [
      { name: 'a', weight: 1 },
      { name: 'b', weight: 1 },
    ];
    expect(weightedRandom(entries)).toBe(entries[entries.length - 1]);
  });
});

describe('uniqueRandomInts', () => {
  it('devuelve count enteros únicos sin repetición', () => {
    const out = uniqueRandomInts(5, 1, 100);
    expect(out).toHaveLength(5);
    expect(new Set(out).size).toBe(5);
  });

  it('entrega siempre ordenado ascendentemente', () => {
    const out = uniqueRandomInts(10, 1, 1000);
    expect(out).toEqual([...out].sort((a, b) => a - b));
  });

  it('caso exhaustivo: count === rango devuelve todos los enteros', () => {
    expect(uniqueRandomInts(3, 1, 3)).toEqual([1, 2, 3]);
  });

  it('lanza cuando count < 1', () => {
    expect(() => uniqueRandomInts(0, 1, 10)).toThrow(
      'uniqueRandomInts: count debe ser >= 1',
    );
  });

  it('lanza cuando el rango es insuficiente, detallando rango y cantidad', () => {
    expect(() => uniqueRandomInts(5, 1, 3)).toThrow(
      'No se pueden generar 5 números únicos en el rango [1, 3] (rango disponible: 3)',
    );
  });
});
