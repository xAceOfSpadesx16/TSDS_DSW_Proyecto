/**
 * TeamSplitterService — Business logic for team generation.
 * Uses Fisher-Yates shuffle and supports exclusion rules.
 */
import { fisherYatesShuffle } from '../utils/mathUtils.js';

const TEAM_COLORS = [
  '#6c5ce7', '#00cec9', '#fd79a8', '#e17055',
  '#00b894', '#fdcb6e', '#0984e3', '#e84393',
  '#55efc4', '#fab1a0', '#74b9ff', '#a29bfe'
];

export class TeamSplitterService {
  /**
   * Split participants into N groups.
   * @param {string[]} participants
   * @param {number} groupCount
   * @param {{ exclusions?: string[][], scores?: Object }} rules
   * @returns {{ teams: string[][], colors: string[] }}
   */
  split(participants, groupCount, rules = {}) {
    const shuffled = fisherYatesShuffle(participants);
    const teams = Array.from({ length: groupCount }, () => []);

    if (rules.exclusions?.length) {
      return this._splitWithExclusions(shuffled, groupCount, rules.exclusions);
    }

    shuffled.forEach((participant, i) => {
      teams[i % groupCount].push(participant);
    });

    return {
      teams,
      colors: TEAM_COLORS.slice(0, groupCount)
    };
  }

  /**
   * Split participants into groups of a given size.
   * @param {string[]} participants
   * @param {number} groupSize
   * @param {{ exclusions?: string[][], scores?: Object }} rules
   * @returns {{ teams: string[][], colors: string[] }}
   */
  splitBySize(participants, groupSize, rules = {}) {
    const groupCount = Math.ceil(participants.length / groupSize);
    return this.split(participants, groupCount, rules);
  }

  _splitWithExclusions(participants, groupCount, exclusions) {
    const teams = Array.from({ length: groupCount }, () => []);
    const assigned = new Map();

    const exclusionMap = new Map();
    for (const [a, b] of exclusions) {
      if (!exclusionMap.has(a)) exclusionMap.set(a, new Set());
      if (!exclusionMap.has(b)) exclusionMap.set(b, new Set());
      exclusionMap.get(a).add(b);
      exclusionMap.get(b).add(a);
    }

    const shuffled = [...participants];
    const smallestTeam = () => {
      let min = Infinity, idx = 0;
      teams.forEach((team, i) => {
        if (team.length < min) { min = team.length; idx = i; }
      });
      return idx;
    };

    for (const participant of shuffled) {
      const forbidden = exclusionMap.get(participant) || new Set();
      let teamIdx = smallestTeam();

      for (let attempt = 0; attempt < groupCount; attempt++) {
        const conflict = teams[teamIdx].some((m) => forbidden.has(m));
        if (!conflict) break;
        teamIdx = (teamIdx + 1) % groupCount;
      }

      teams[teamIdx].push(participant);
      assigned.set(participant, teamIdx);
    }

    return {
      teams,
      colors: TEAM_COLORS.slice(0, groupCount)
    };
  }
}
