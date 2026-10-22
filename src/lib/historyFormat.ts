// =============================================================================
// historyFormat — presentación de los resultados del historial.
//
// Convierte el `record` de cada sorteo en un resumen legible y, para equipos,
// en la lista de integrantes que el panel muestra dentro de un `<details>`.
// Es una función pura y compartida por el panel y sus tests.
// =============================================================================

import type { LocalHistoryEntry } from '../store/historyStore';

export interface HistoryTeamView {
  name: string;
  members: string[];
}

export interface HistoryResultView {
  summary: string;
  teams?: HistoryTeamView[];
}

export interface HistoryGroup {
  dateKey: string;
  label: string;
  entries: LocalHistoryEntry[];
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('es', {
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Resume el resultado real de un sorteo. Si la entrada no tiene `record`
 * (por ejemplo, un registro viejo o una entrada manipulada), cae en la
 * descripción que ya trae el store.
 */
function fallback(entry: LocalHistoryEntry): HistoryResultView {
  return { summary: entry.description };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

/**
 * Resume el resultado real de un sorteo. Si la entrada no tiene `record`
 * (por ejemplo, un registro viejo) o el `record` no respeta la forma de su
 * módulo, cae en la descripción que ya trae el store.
 */
export function formatHistoryResult(entry: LocalHistoryEntry): HistoryResultView {
  const record = entry.record;
  if (!record) {
    return fallback(entry);
  }

  switch (record.module_name) {
    case 'dice': {
      const rolls: unknown = record.result.rolls;
      const total: unknown = record.result.total;
      const modifier: unknown = record.result.modifier;
      if (!isNumberArray(rolls) || typeof total !== 'number') {
        return fallback(entry);
      }
      const modifierNumber = typeof modifier === 'number' ? modifier : 0;
      const rollLabel = rolls.length === 1 ? 'Tirada' : 'Tiradas';
      const modifierLabel =
        modifierNumber === 0
          ? ''
          : ` (${modifierNumber > 0 ? '+' : ''}${modifierNumber})`;
      return {
        summary: `${rollLabel}: ${rolls.join(', ')} · Total: ${total}${modifierLabel}`,
      };
    }
    case 'numbers': {
      const numbers: unknown = record.result.numbers;
      if (!isNumberArray(numbers) || numbers.length === 0) {
        return fallback(entry);
      }
      return {
        summary: `${numbers.length === 1 ? 'Número' : 'Números'}: ${numbers.join(', ')}`,
      };
    }
    case 'roulette': {
      const winner: unknown = record.result.winner;
      if (!isRecord(winner) || typeof winner.label !== 'string') {
        return fallback(entry);
      }
      return { summary: `Ganador: ${winner.label}` };
    }
    case 'teams': {
      const teams: unknown = record.result.teams;
      if (
        !Array.isArray(teams) ||
        !teams.every(
          (team) =>
            Array.isArray(team) &&
            team.every((member) => typeof member === 'string'),
        )
      ) {
        return fallback(entry);
      }
      const teamList = teams as string[][];
      const teamLabel = teamList.length === 1 ? 'equipo' : 'equipos';
      const memberCount = teamList.reduce(
        (total, team) => total + team.length,
        0,
      );
      return {
        summary: `${teamList.length} ${teamLabel} · ${memberCount} integrantes`,
        teams: teamList.map((members, index) => ({
          name: `Equipo ${index + 1}`,
          members,
        })),
      };
    }
    case 'weighted': {
      const winner: unknown = record.result.winner;
      const probability: unknown = record.result.probability;
      if (
        !isRecord(winner) ||
        typeof winner.name !== 'string' ||
        typeof probability !== 'number'
      ) {
        return fallback(entry);
      }
      return {
        summary: `Ganador: ${winner.name} · ${probability}%`,
      };
    }
  }

  return fallback(entry);
}

/** Hora local de la entrada, con dos dígitos. */
export function formatHistoryTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return TIME_FORMATTER.format(date);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readableDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  return DATE_FORMATTER.format(date);
}

/**
 * Agrupa las entradas por día local conservando el orden recibido (más
 * reciente primero). "Hoy" y "Ayer" se calculan contra `now`, que los tests
 * pueden fijar.
 */
export function formatHistoryGroups(
  entries: LocalHistoryEntry[],
  now: Date = new Date(),
): HistoryGroup[] {
  const today = localDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);

  const groups = new Map<string, LocalHistoryEntry[]>();
  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const key = Number.isNaN(date.getTime())
      ? 'sin-fecha'
      : localDateKey(date);
    const current = groups.get(key) ?? [];
    current.push(entry);
    groups.set(key, current);
  }

  return Array.from(groups, ([dateKey, groupEntries]) => ({
    dateKey,
    label:
      dateKey === today
        ? 'Hoy'
        : dateKey === yesterday
          ? 'Ayer'
          : dateKey === 'sin-fecha'
            ? 'Sin fecha'
            : readableDate(dateKey),
    entries: groupEntries,
  }));
}
