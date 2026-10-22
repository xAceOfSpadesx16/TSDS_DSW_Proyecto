// @vitest-environment jsdom
// =============================================================================
// historyFormat — resultados reales por módulo y agrupación por día.
// =============================================================================

import { describe, expect, it } from 'vitest';

import {
  formatHistoryGroups,
  formatHistoryResult,
  formatHistoryTime,
} from '../../../src/lib/historyFormat';
import type { LocalHistoryEntry } from '../../../src/store/historyStore';
import type { CreateHistoryPayload } from '../../../src/domain/types';

function entry(
  record: CreateHistoryPayload,
  timestamp = '2026-10-20T15:00:00.000Z',
): LocalHistoryEntry {
  return {
    id: `id-${record.module_name}`,
    module: record.module_name,
    description: 'descripción de respaldo',
    timestamp,
    synced: true,
    record,
  };
}

const DICE: CreateHistoryPayload = {
  module_name: 'dice',
  action: '2d6+3',
  payload: { sides: 6, modifier: 3, count: 2, formula: '2d6+3' },
  result: { rolls: [3, 5], total: 11, modifier: 3, formula: '2d6+3' },
};

const NUMBERS: CreateHistoryPayload = {
  module_name: 'numbers',
  action: '3 números',
  payload: { count: 3, min: 1, max: 10, unique: true },
  result: { numbers: [3, 7, 9] },
};

const ROULETTE: CreateHistoryPayload = {
  module_name: 'roulette',
  action: 'Ganador: Pizza',
  payload: { options: [{ label: 'Pizza', color: '#6c5ce7' }] },
  result: { winner: { label: 'Pizza', color: '#6c5ce7' } },
};

const TEAMS: CreateHistoryPayload = {
  module_name: 'teams',
  action: '3 participantes → 2 equipos',
  payload: { participants: ['Ana', 'Bruno', 'Carla'], mode: 'count', value: 2 },
  result: {
    teams: [
      ['Ana', 'Bruno'],
      ['Carla'],
    ],
    colors: ['#6c5ce7', '#00cec9'],
  },
};

const WEIGHTED: CreateHistoryPayload = {
  module_name: 'weighted',
  action: 'Ganador: Ana (60%)',
  payload: { entries: [{ name: 'Ana', weight: 3 }] },
  result: { winner: { name: 'Ana', weight: 3 }, probability: 60 },
};

describe('formatHistoryResult', () => {
  it('muestra tiradas y total de dados', () => {
    expect(formatHistoryResult(entry(DICE)).summary).toBe(
      'Tiradas: 3, 5 · Total: 11 (+3)',
    );
  });

  it('muestra los números obtenidos, no la configuración', () => {
    expect(formatHistoryResult(entry(NUMBERS)).summary).toBe('Números: 3, 7, 9');
  });

  it('muestra el ganador de la ruleta', () => {
    expect(formatHistoryResult(entry(ROULETTE)).summary).toBe('Ganador: Pizza');
  });

  it('muestra los equipos y sus integrantes', () => {
    const view = formatHistoryResult(entry(TEAMS));
    expect(view.summary).toBe('2 equipos · 3 integrantes');
    expect(view.teams).toEqual([
      { name: 'Equipo 1', members: ['Ana', 'Bruno'] },
      { name: 'Equipo 2', members: ['Carla'] },
    ]);
  });

  it('muestra ganador y probabilidad del sorteo ponderado', () => {
    expect(formatHistoryResult(entry(WEIGHTED)).summary).toBe(
      'Ganador: Ana · 60%',
    );
  });

  it('cae en la descripción si la entrada no tiene record', () => {
    const legacy: LocalHistoryEntry = {
      id: 'legacy',
      module: 'dice',
      description: 'd20 = 7',
      timestamp: '2026-10-20T15:00:00.000Z',
      synced: true,
    };
    expect(formatHistoryResult(legacy).summary).toBe('d20 = 7');
  });

  it('cae en la descripción si el record no respeta la forma del módulo', () => {
    const corrupt: LocalHistoryEntry = {
      ...entry(DICE),
      record: {
        ...DICE,
        result: {},
      } as CreateHistoryPayload,
    };
    expect(formatHistoryResult(corrupt).summary).toBe('descripción de respaldo');
  });
});

describe('formatHistoryGroups', () => {
  const now = new Date(2026, 9, 20, 12, 0, 0);

  it('agrupa por día local con Hoy, Ayer y fecha', () => {
    const today = new Date(2026, 9, 20, 10, 0, 0).toISOString();
    const yesterday = new Date(2026, 9, 19, 10, 0, 0).toISOString();
    const older = new Date(2026, 9, 1, 10, 0, 0).toISOString();

    const groups = formatHistoryGroups(
      [entry(DICE, today), entry(NUMBERS, yesterday), entry(ROULETTE, older)],
      now,
    );

    expect(groups.map((group) => group.label)).toEqual([
      'Hoy',
      'Ayer',
      expect.stringContaining('2026'),
    ]);
    expect(groups[0].dateKey).toBe('2026-10-20');
    expect(groups[1].dateKey).toBe('2026-10-19');
  });

  it('da formato HH:mm y tolera fechas inválidas', () => {
    expect(formatHistoryTime('2026-10-20T15:05:00.000Z')).toMatch(
      /\d{1,2}:\d{2}/,
    );
    expect(formatHistoryTime('no-es-fecha')).toBe('--:--');
    const groups = formatHistoryGroups(
      [
        {
          ...entry(DICE),
          timestamp: 'no-es-fecha',
        },
      ],
      now,
    );
    expect(groups[0].label).toBe('Sin fecha');
  });
});
