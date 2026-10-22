// =============================================================================
// TeamsStrategy — módulo `teams`.
//
// Divide una lista de participantes en `value` grupos (modo `count`) o en
// grupos de tamaño `value` (modo `size`). Soporta exclusiones: dos personas
// que no pueden terminar en el mismo equipo.
// =============================================================================

import type {
  TeamsInput,
  TeamsMode,
  TeamsResult,
} from '../domain/contracts';
import type { DrawExecution, DrawStrategy } from '../domain/contracts';
import { fisherYatesShuffle } from '../lib/mathUtils';
import { TEAM_PALETTE } from '../lib/palette';

// Paleta compartida para los bordes de las tarjetas de equipo. Los colores
// viven en `palette.ts` porque también los usa la ruleta y el canvas.
export const TEAM_COLORS: readonly string[] = TEAM_PALETTE;

function pickColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

function roundRobinSplit(shuffled: string[], groupCount: number): string[][] {
  const teams: string[][] = Array.from({ length: groupCount }, () => []);
  shuffled.forEach((participant, i) => {
    teams[i % groupCount].push(participant);
  });
  return teams;
}

/**
 * Valida y normaliza las exclusiones contra la lista real de participantes.
 * La UI ya las elige de una lista, pero la estrategia no confía en eso: así
 * ningún payload manipulado puede generar un resultado que viole una regla.
 */
function normalizeExclusions(
  participants: string[],
  exclusions: ReadonlyArray<[string, string]>,
): Array<[string, string]> {
  const participantSet = new Set(participants);
  const seen = new Set<string>();
  const normalized: Array<[string, string]> = [];

  for (const raw of exclusions) {
    const a = raw[0].trim();
    const b = raw[1].trim();
    if (!a || !b) {
      throw new Error('Cada exclusión necesita dos personas.');
    }
    if (a === b) {
      throw new Error(`La exclusión ${a} ↔ ${b} no puede repetir a la misma persona.`);
    }
    if (!participantSet.has(a) || !participantSet.has(b)) {
      throw new Error(
        `La exclusión ${a} ↔ ${b} incluye a alguien que no participa. Elegí dos personas de la lista.`,
      );
    }
    // JSON evita colisiones con nombres que contengan separadores como `|`.
    const key = JSON.stringify([a, b].sort());
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push([a, b]);
  }

  return normalized;
}

/** Capacidad de cada equipo para repartir de forma equilibrada. */
function teamCapacities(total: number, groupCount: number): number[] {
  const base = Math.floor(total / groupCount);
  const extra = total % groupCount;
  return Array.from({ length: groupCount }, (_, i) => base + (i < extra ? 1 : 0));
}

function impossibleExclusionsMessage(
  exclusions: ReadonlyArray<[string, string]>,
  groupCount: number,
): string {
  const pairs = exclusions.map(([a, b]) => `${a} ↔ ${b}`).join(', ');
  const subject = exclusions.length === 1 ? 'la restricción' : 'las restricciones';
  const verb = exclusions.length === 1 ? 'No se puede cumplir' : 'No se pueden cumplir';
  const teamsLabel = groupCount === 1 ? 'equipo' : 'equipos';
  return `${verb} ${subject} con ${groupCount} ${teamsLabel} de tamaño equilibrado: ${pairs}. Ajustá la cantidad de equipos o el tamaño de grupo, o quitá alguna restricción.`;
}

/**
 * Split respetando exclusiones (pares que no pueden ir juntos).
 *
 * Usa backtracking con capacidad por equipo y heurística de "menos opciones
 * primero". Si no existe una asignación válida, lanza un error en vez de
 * devolver un resultado que viole una exclusión.
 */
function splitWithExclusions(
  participants: string[],
  groupCount: number,
  exclusions: ReadonlyArray<[string, string]>,
): string[][] {
  const normalized = normalizeExclusions(participants, exclusions);
  const exclusionSet = new Set<string>();
  for (const [a, b] of normalized) {
    exclusionSet.add(JSON.stringify([a, b]));
    exclusionSet.add(JSON.stringify([b, a]));
  }

  const capacities = teamCapacities(participants.length, groupCount);
  const teams: string[][] = Array.from({ length: groupCount }, () => []);
  // Array, no Set: la lista puede tener nombres repetidos y cada aparición
  // debe terminar en un equipo.
  const remaining = fisherYatesShuffle(participants);

  const canPlace = (participant: string, teamIndex: number): boolean =>
    teams[teamIndex].every(
      (member) => !exclusionSet.has(JSON.stringify([participant, member])),
    );

  const assign = (): boolean => {
    if (remaining.length === 0) {
      return true;
    }

    // MRV: elegimos primero a quien tiene menos equipos disponibles.
    let chosenIndex = -1;
    let chosenOptions: number[] = [];
    for (let i = 0; i < remaining.length; i++) {
      const participant = remaining[i];
      const options = teams
        .map((_, teamIndex) => teamIndex)
        .filter(
          (teamIndex) =>
            teams[teamIndex].length < capacities[teamIndex] &&
            canPlace(participant, teamIndex),
        );
      if (options.length === 0) {
        return false;
      }
      if (chosenIndex === -1 || options.length < chosenOptions.length) {
        chosenIndex = i;
        chosenOptions = options;
      }
    }

    const [chosen] = remaining.splice(chosenIndex, 1);
    const candidates = fisherYatesShuffle(chosenOptions).sort(
      (a, b) => teams[a].length - teams[b].length,
    );
    for (const teamIndex of candidates) {
      teams[teamIndex].push(chosen);
      if (assign()) {
        return true;
      }
      teams[teamIndex].pop();
    }
    remaining.splice(chosenIndex, 0, chosen);
    return false;
  };

  if (!assign()) {
    throw new Error(impossibleExclusionsMessage(normalized, groupCount));
  }
  return teams;
}

function resolveGroupCount(
  participants: string[],
  mode: TeamsMode,
  value: number,
): number {
  if (mode === 'count') {
    if (value < 1) {
      throw new Error('La cantidad de grupos debe ser >= 1.');
    }
    if (value > participants.length) {
      throw new Error(
        `No se pueden formar ${value} grupos con ${participants.length} participantes.`,
      );
    }
    return value;
  }
  // mode === 'size'
  if (value < 1) {
    throw new Error('El tamaño de grupo debe ser >= 1.');
  }
  return Math.ceil(participants.length / value);
}

export class TeamsStrategy implements DrawStrategy<TeamsInput, TeamsResult, TeamsResult> {
  readonly moduleId = 'teams' as const;

  actionLabel(input: TeamsInput): string {
    const word = input.mode === 'count' ? 'grupos' : 'tam. grupo';
    return `${input.participants.length} participantes → ${input.value} ${word}`;
  }

  buildPayload(input: TeamsInput): TeamsInput {
    return {
      participants: input.participants,
      mode: input.mode,
      value: input.value,
      ...(input.exclusions && input.exclusions.length > 0
        ? { exclusions: input.exclusions.map(([a, b]) => [a, b]) }
        : {}),
    };
  }

  execute(input: TeamsInput): DrawExecution<TeamsResult, TeamsResult> {
    const participants = input.participants
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (participants.length < 2) {
      throw new Error('Necesitás al menos 2 participantes.');
    }

    const groupCount = resolveGroupCount(participants, input.mode, input.value);
    const teams =
      input.exclusions && input.exclusions.length > 0
        ? splitWithExclusions(participants, groupCount, input.exclusions)
        : roundRobinSplit(fisherYatesShuffle(participants), groupCount);

    const colors = teams.map((_, i) => pickColor(i));
    const result: TeamsResult = { teams, colors };
    return { local: result, backend: result };
  }
}

export const teamsStrategy = new TeamsStrategy();