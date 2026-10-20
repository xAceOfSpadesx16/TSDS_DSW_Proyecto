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

    it('conserva los nombres repetidos al repartir', () => {
      const { local } = new TeamsStrategy().execute({
        participants: ['a', 'a', 'b', 'b'],
        mode: 'count',
        value: 2,
      });
      expect(local.teams.flat().sort()).toEqual(['a', 'a', 'b', 'b']);
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

    it('lanza cuando las exclusiones son imposibles en vez de devolver un resultado inválido', () => {
      // 3 participantes mutuamente excluidos y solo 2 grupos: no hay forma
      // de separar los tres pares.
      expect(() =>
        new TeamsStrategy().execute({
          participants: ['a', 'b', 'c'],
          mode: 'count',
          value: 2,
          exclusions: [
            ['a', 'b'],
            ['a', 'c'],
            ['b', 'c'],
          ],
        }),
      ).toThrow(/No se pueden cumplir las restricciones.*a ↔ b/);
    });

    it('nombra todas las restricciones, incluida la que vuelve imposible el conjunto', () => {
      expect(() =>
        new TeamsStrategy().execute({
          participants: ['a', 'b', 'c', 'd', 'e'],
          mode: 'count',
          value: 2,
          exclusions: [
            ['a', 'b'],
            ['a', 'c'],
            ['a', 'd'],
            ['b', 'c'],
          ],
        }),
      ).toThrow(/b ↔ c/);
    });

    it('no colisiona con nombres que contienen el separador |', () => {
      const strategy = new TeamsStrategy();
      for (let i = 0; i < 50; i++) {
        const { local } = strategy.execute({
          participants: ['a|b', 'c', 'a', 'b|c', 'd'],
          mode: 'count',
          value: 2,
          exclusions: [
            ['a|b', 'c'],
            ['a', 'b|c'],
          ],
        });
        const teamOf = (name: string) =>
          local.teams.findIndex((team) => team.includes(name));
        expect(teamOf('a|b')).not.toBe(teamOf('c'));
        expect(teamOf('a')).not.toBe(teamOf('b|c'));
      }
    });

    it('lanza si una exclusión menciona a alguien que no participa', () => {
      expect(() =>
        new TeamsStrategy().execute({
          participants: ['a', 'b', 'c'],
          mode: 'count',
          value: 2,
          exclusions: [['a', 'z']],
        }),
      ).toThrow(/incluye a alguien que no participa/);
    });

    it('lanza si una exclusión repite a la misma persona', () => {
      expect(() =>
        new TeamsStrategy().execute({
          participants: ['a', 'b'],
          mode: 'count',
          value: 2,
          exclusions: [['a', 'a']],
        }),
      ).toThrow(/no puede repetir a la misma persona/);
    });

    it('respeta una exclusión posible en 50 sorteos consecutivos', () => {
      const strategy = new TeamsStrategy();
      for (let i = 0; i < 50; i++) {
        const { local } = strategy.execute({
          participants: ['a', 'b', 'c', 'd', 'e', 'f'],
          mode: 'count',
          value: 2,
          exclusions: [['a', 'b']],
        });
        const teamWithA = local.teams.find((team) => team.includes('a'));
        expect(teamWithA).toBeDefined();
        expect(teamWithA).not.toContain('b');
      }
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
