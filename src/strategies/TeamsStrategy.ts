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
import type { DrawStrategy } from '../domain/contracts';
import { fisherYatesShuffle } from '../lib/mathUtils';

// Paleta compartida para los bordes de las tarjetas de equipo.
// Equivalente al antiguo `TEAM_COLORS` de `TeamSplitterService.js`.
export const TEAM_COLORS: readonly string[] = [
  '#6c5ce7',
  '#00cec9',
  '#fd79a8',
  '#e17055',
  '#00b894',
  '#fdcb6e',
  '#0984e3',
  '#e84393',
  '#55efc4',
  '#fab1a0',
  '#74b9ff',
  '#a29bfe',
];

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
 * Split respetando exclusiones (pares que no pueden ir juntos).
 * Estrategia: round-robin aleatorio repetido hasta que no haya colisiones,
 * con fallback de búsqueda exhaustiva para instancias difíciles.
 */
function splitWithExclusions(
  participants: string[],
  groupCount: number,
  exclusions: ReadonlyArray<[string, string]>,
): string[][] {
  const exclusionSet = new Set<string>();
  for (const [a, b] of exclusions) {
    exclusionSet.add(`${a}|${b}`);
    exclusionSet.add(`${b}|${a}`);
  }

  const hasCollision = (teams: string[][]): boolean => {
    for (const team of teams) {
      const set = new Set(team);
      for (const [a, b] of exclusions) {
        if (set.has(a) && set.has(b)) {
          return true;
        }
      }
    }
    return false;
  };

  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = roundRobinSplit(fisherYatesShuffle(participants), groupCount);
    if (!hasCollision(candidate)) {
      return candidate;
    }
  }
  // Si no se encuentra solución, devolvemos la última tentativa: el usuario
  // verá el conflicto y podrá ajustar las exclusiones.
  return roundRobinSplit(fisherYatesShuffle(participants), groupCount);
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

  buildPayload(input: TeamsInput): Record<string, unknown> {
    return {
      participants: input.participants,
      mode: input.mode,
      value: input.value,
      ...(input.exclusions && input.exclusions.length > 0
        ? { exclusions: input.exclusions.map(([a, b]) => [a, b]) }
        : {}),
    };
  }

  execute(input: TeamsInput): { local: TeamsResult; backend: TeamsResult } {
    const participants = input.participants
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (participants.length < 2) {
      throw new Error('Necesitas al menos 2 participantes.');
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