// @vitest-environment jsdom
// =============================================================================
// storage — prefijo, versión, validación y tolerancia a datos corruptos.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  LocalHistoryEntry,
  PendingDraw,
} from '../../../src/lib/storage';
import {
  MAX_GUEST_ENTRIES,
  STORAGE_SCHEMA_VERSION,
  clearGuestHistory,
  clearPendingDraws,
  clearRouletteOptions,
  isStorageAvailable,
  loadDiceOptions,
  loadGuestHistory,
  loadNumbersOptions,
  loadPendingDraws,
  loadRouletteOptions,
  loadTeamsOptions,
  loadWeightedOptions,
  removePendingDraw,
  saveDiceOptions,
  saveGuestHistory,
  saveNumbersOptions,
  savePendingDraw,
  saveRouletteOptions,
  saveTeamsOptions,
  saveWeightedOptions,
} from '../../../src/lib/storage';
import type { CreateHistoryPayload } from '../../../src/domain/types';
import { installLocalStorage } from '../helpers/localStorageMock';

const RECORD: CreateHistoryPayload = {
  module_name: 'dice',
  action: 'd6',
  payload: { sides: 6, modifier: 0 },
  result: { rolls: [4], modifier: 0, total: 4 },
};

function entry(id: string): LocalHistoryEntry {
  return {
    id,
    module: 'dice',
    description: `Tirada ${id}`,
    timestamp: '2026-10-20T12:00:00.000Z',
    synced: false,
    record: RECORD,
  };
}

function pending(id: string, userId: number): LocalHistoryEntry {
  return {
    ...entry(id),
    pending: { record: RECORD, userId } satisfies PendingDraw,
  };
}

describe('storage — historial de invitado', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guarda con prefijo y versión, y restaura el historial', () => {
    saveGuestHistory([entry('1'), entry('2')]);

    const raw = localStorage.getItem('thrive_guest_history_v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as {
      version: number;
      data: LocalHistoryEntry[];
    };
    expect(parsed.version).toBe(STORAGE_SCHEMA_VERSION);
    expect(parsed.data).toHaveLength(2);
    expect(loadGuestHistory()).toHaveLength(2);
  });

  it('tolera JSON corrupto, versión desconocida y formas inválidas', () => {
    localStorage.setItem('thrive_guest_history_v1', '{no-es-json');
    expect(loadGuestHistory()).toEqual([]);

    localStorage.setItem(
      'thrive_guest_history_v1',
      JSON.stringify({ version: 99, data: [entry('1')] }),
    );
    expect(loadGuestHistory()).toEqual([]);

    localStorage.setItem(
      'thrive_guest_history_v1',
      JSON.stringify({ version: STORAGE_SCHEMA_VERSION, data: [{ foo: 'bar' }] }),
    );
    expect(loadGuestHistory()).toEqual([]);
  });

  it('respeta el tope de 100 entradas', () => {
    const many = Array.from({ length: 105 }, (_, i) => entry(String(i)));
    saveGuestHistory(many);
    expect(loadGuestHistory()).toHaveLength(MAX_GUEST_ENTRIES);
  });

  it('limpia el historial de invitado', () => {
    saveGuestHistory([entry('1')]);
    clearGuestHistory();
    expect(loadGuestHistory()).toEqual([]);
  });

  it('no rompe si localStorage no está disponible', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(isStorageAvailable()).toBe(false);
    expect(() => saveGuestHistory([entry('1')])).not.toThrow();
    expect(loadGuestHistory()).toEqual([]);
  });
});

describe('storage — pendientes por usuario', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('separa los pendientes por id de usuario', () => {
    savePendingDraw(7, pending('p7', 7));
    savePendingDraw(9, pending('p9', 9));

    expect(loadPendingDraws(7).map((e) => e.id)).toEqual(['p7']);
    expect(loadPendingDraws(9).map((e) => e.id)).toEqual(['p9']);
    expect(loadPendingDraws(8)).toEqual([]);
  });

  it('quita un pendiente y limpia todos los de un usuario', () => {
    savePendingDraw(7, pending('p1', 7));
    savePendingDraw(7, pending('p2', 7));

    removePendingDraw(7, 'p1');
    expect(loadPendingDraws(7).map((e) => e.id)).toEqual(['p2']);

    clearPendingDraws(7);
    expect(loadPendingDraws(7)).toEqual([]);
  });
});

describe('storage — opciones por pantalla', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guarda y restaura las opciones de cada módulo', () => {
    saveDiceOptions({ lastSides: 20, modifier: 3 });
    saveNumbersOptions({ count: 7, min: 2, max: 9, unique: false });
    saveRouletteOptions([{ label: 'Sí', color: '#6c5ce7' }]);
    saveTeamsOptions({
      participantsText: 'Ana\nBruno',
      mode: 'size',
      value: 3,
      exclusions: [['Ana', 'Bruno']],
    });
    saveWeightedOptions({
      entries: [{ name: 'Ana', weight: 4 }],
      originalEntries: [{ name: 'Ana', weight: 4 }],
      autoRemove: true,
    });

    expect(loadDiceOptions()).toEqual({ lastSides: 20, modifier: 3 });
    expect(loadNumbersOptions()).toEqual({
      count: 7,
      min: 2,
      max: 9,
      unique: false,
    });
    expect(loadRouletteOptions()).toEqual({
      options: [{ label: 'Sí', color: '#6c5ce7' }],
    });
    expect(loadTeamsOptions()).toEqual({
      participantsText: 'Ana\nBruno',
      mode: 'size',
      value: 3,
      exclusions: [['Ana', 'Bruno']],
    });
    expect(loadWeightedOptions()).toEqual({
      entries: [{ name: 'Ana', weight: 4 }],
      originalEntries: [{ name: 'Ana', weight: 4 }],
      autoRemove: true,
    });
  });

  it('rechaza valores fuera de rango o corruptos', () => {
    localStorage.setItem(
      'thrive_dice_options_v1',
      JSON.stringify({ version: 1, data: { lastSides: 7, modifier: 0 } }),
    );
    expect(loadDiceOptions()).toBeNull();

    localStorage.setItem(
      'thrive_numbers_options_v1',
      JSON.stringify({
        version: 1,
        data: { count: 2, min: 10, max: 1, unique: true },
      }),
    );
    expect(loadNumbersOptions()).toBeNull();

    localStorage.setItem(
      'thrive_roulette_options_v1',
      JSON.stringify({ version: 1, data: { options: [{ label: 1 }] } }),
    );
    expect(loadRouletteOptions()).toBeNull();

    localStorage.setItem(
      'thrive_teams_options_v1',
      JSON.stringify({
        version: 1,
        data: { participantsText: '', mode: 'otro', value: 2, exclusions: [] },
      }),
    );
    expect(loadTeamsOptions()).toBeNull();

    localStorage.setItem(
      'thrive_weighted_options_v1',
      JSON.stringify({
        version: 1,
        data: { entries: [], originalEntries: [], autoRemove: 'sí' },
      }),
    );
    expect(loadWeightedOptions()).toBeNull();
  });

  it('permite persistir una ruleta vacía', () => {
    clearRouletteOptions();
    saveRouletteOptions([]);
    expect(loadRouletteOptions()).toEqual({ options: [] });
  });
});
