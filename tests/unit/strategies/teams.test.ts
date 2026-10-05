// =============================================================================
// Unit tests — src/strategies/TeamsStrategy.ts. PLAN 4.2.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { TeamsStrategy, TEAM_COLORS } from '../../../src/strategies/TeamsStrategy';

describe('TeamsStrategy', () => {
  it('moduleId === "teams"', () => {
    expect(new TeamsStrategy().moduleId).toBe('teams');
  });

  describe('actionLabel', () => {
    it('usa "grupos" en modo count', () => {
      expect(
        new TeamsStrategy().actionLabel({
          participants: ['a', 'b', 'c'],
          mode: 'count',
          value: 2,
        }),
      ).toContain('grupos');
    });

    it('usa "tam. grupo" en modo size', () => {
      expect(
        new TeamsStrategy().actionLabel({
          participants: ['a', 'b', 'c'],
          mode: 'size',
          value: 2,
        }),
      ).toContain('tam. grupo');
    });
  });

  describe('buildPayload', () => {
    it('incluye participants, mode y value', () => {
      const p = new TeamsStrategy().buildPayload({
        participants: ['a', 'b'],
        mode: 'count',
        value: 2,
      });
      expect(p.participants).toEqual(['a', 'b']);
      expect(p.mode).toBe('count');
      expect(p.value).toBe(2);
    });

    it('incluye exclusions solo cuando hay pares definidos', () => {
      const noExclusions = new TeamsStrategy().buildPayload({
        participants: ['a', 'b'],
        mode: 'count',
        value: 2,
      });
      expect('exclusions' in noExclusions).toBe(false);

      const withExclusions = new TeamsStrategy().buildPayload({
        participants: ['a', 'b', 'c'],
        mode: 'count',
        value: 2,
        exclusions: [['a', 'b']],
      });
      expect(withExclusions.exclusions).toEqual([['a', 'b']]);
    });
  });

  describe('validaciones', () => {
    it('lanza con menos de 2 participantes válidos', () => {
      expect(() =>
        new TeamsStrategy().execute({
          participants: ['  ', 'a'],
          mode: 'count',
          value: 1,
        }),
      ).toThrow(/al menos 2 participantes/);
    });

    it('modo count: lanza si value < 1', () => {
      expect(() =>
        new TeamsStrategy().execute({
          participants: ['a', 'b'],
          mode: 'count',
          value: 0,
        }),
      ).toThrow(/>= 1/);
    });

    it('modo count: lanza si value > participantes', () => {
      expect(() =>
        new TeamsStrategy().execute({
          participants: ['a', 'b'],
          mode: 'count',
          value: 3,
        }),
      ).toThrow(/No se pueden formar/);
    });

    it('modo size: lanza si value < 1', () => {
      expect(() =>
        new TeamsStrategy().execute({
          participants: ['a', 'b'],
          mode: 'size',
          value: 0,
        }),
      ).toThrow(/tamaño de grupo/);
    });
  });

  describe('execute modo count', () => {
    it('forma exactamente N grupos con todos los participantes una vez', () => {
      const { local } = new TeamsStrategy().execute({
        participants: ['a', 'b', 'c', 'd'],
        mode: 'count',
        value: 2,
      });
      expect(local.teams).toHaveLength(2);
      const all = local.teams.flat();
      expect(all.sort()).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('execute modo size', () => {
    it('calcula grupos como ceil(total / tamaño)', () => {
      // 5 participantes / tamaño 2 → 3 grupos
      const { local } = new TeamsStrategy().execute({
        participants: ['a', 'b', 'c', 'd', 'e'],
        mode: 'size',
        value: 2,
      });
      expect(local.teams.length).toBe(3);
    });
  });

  describe('pares de exclusión', () => {
    it('separa un pair excluido cuando hay solución factible', () => {
      const { local } = new TeamsStrategy().execute({
        participants: ['a', 'b', 'c', 'd', 'e', 'f'],
        mode: 'count',
        value: 2,
        exclusions: [['a', 'b']],
      });
      const teamWithA = local.teams.find((t) => t.includes('a'));
      expect(teamWithA).toBeDefined();
      expect(teamWithA).not.toContain('b');
    });

    it('fallback sin excepciones cuando las exclusiones son imposibles', () => {
      // 2 participantes, 1 grupo y excluidos entre sí: no se pueden separar.
      const { local } = new TeamsStrategy().execute({
        participants: ['a', 'b'],
        mode: 'count',
        value: 1,
        exclusions: [['a', 'b']],
      });
      expect(local.teams).toHaveLength(1);
      expect(local.teams[0]).toHaveLength(2);
    });
  });

  describe('colores', () => {
    it('asigna colores cíclicamente desde TEAM_COLORS', () => {
      const { local } = new TeamsStrategy().execute({
        participants: ['a', 'b', 'c', 'd', 'e'],
        mode: 'count',
        value: 5,
      });
      local.colors.forEach((color, i) => {
        expect(color).toBe(TEAM_COLORS[i % TEAM_COLORS.length]);
      });
    });
  });
});
