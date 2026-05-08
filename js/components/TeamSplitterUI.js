/**
 * TeamSplitterUI — DOM controller for the Team Splitter module.
 */
import { $, createElement, clearContainer } from '../utils/domHelpers.js';
import { TeamSplitterService } from '../services/TeamSplitterService.js';
import { storageService } from '../services/StorageService.js';

export class TeamSplitterUI {
  constructor() {
    this.service = new TeamSplitterService();
    this.exclusions = [];
    this.mode = 'count';

    this.form = $('#team-form');
    this.participantsInput = $('#team-participants');
    this.valueInput = $('#team-value');
    this.valueLabel = $('#team-value-label');
    this.resultsOutput = $('#team-results');
    this.modeCountBtn = $('#mode-group-count');
    this.modeSizeBtn = $('#mode-group-size');
    this.addExclusionBtn = $('#add-exclusion-btn');
    this.exclusionList = $('#exclusion-list');

    this._bindEvents();
  }

  _bindEvents() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._generate();
    });

    this.modeCountBtn.addEventListener('click', () => this._setMode('count'));
    this.modeSizeBtn.addEventListener('click', () => this._setMode('size'));
    this.addExclusionBtn.addEventListener('click', () => this._addExclusion());
  }

  _setMode(mode) {
    this.mode = mode;
    this.modeCountBtn.className = `btn ${mode === 'count' ? 'btn--primary' : 'btn--secondary'} btn--sm`;
    this.modeSizeBtn.className = `btn ${mode === 'size' ? 'btn--primary' : 'btn--secondary'} btn--sm`;
    this.modeCountBtn.setAttribute('aria-pressed', String(mode === 'count'));
    this.modeSizeBtn.setAttribute('aria-pressed', String(mode === 'size'));
    this.valueLabel.textContent = mode === 'count' ? 'Cantidad de grupos' : 'Tamaño de grupo';
    this.valueInput.min = mode === 'count' ? '2' : '1';
    this.valueInput.value = mode === 'count' ? '2' : '3';
  }

  _addExclusion() {
    const a = $('#exclusion-a').value.trim();
    const b = $('#exclusion-b').value.trim();
    if (!a || !b) return;

    this.exclusions.push([a, b]);

    const chip = createElement('li', { className: 'chip' }, [
      `${a} ≠ ${b}`,
      createElement('button', {
        className: 'chip__remove',
        ariaLabel: `Eliminar exclusión ${a} y ${b}`,
        onClick: () => {
          this.exclusions = this.exclusions.filter(([x, y]) => !(x === a && y === b));
          chip.remove();
        }
      }, ['×'])
    ]);

    this.exclusionList.appendChild(chip);
    $('#exclusion-a').value = '';
    $('#exclusion-b').value = '';
  }

  _generate() {
    const raw = this.participantsInput.value.trim();
    if (!raw) return;

    const participants = raw.split('\n').map((n) => n.trim()).filter(Boolean);
    const value = parseInt(this.valueInput.value, 10);

    if (participants.length < 2) return;

    const rules = this.exclusions.length ? { exclusions: this.exclusions } : {};
    const result = this.mode === 'count'
      ? this.service.split(participants, value, rules)
      : this.service.splitBySize(participants, value, rules);

    clearContainer(this.resultsOutput);

    result.teams.forEach((team, i) => {
      const card = createElement('article', {
        className: 'team-card team-card--colored animate-pulse',
        cssVars: { '--team-color': result.colors[i] }
      }, [
        createElement('h3', {
          className: 'team-card__title team-card__title--colored'
        }, [`Equipo ${i + 1}`]),
        createElement('p', { className: 'team-card__members' }, [
          team.join(', ')
        ])
      ]);
      this.resultsOutput.appendChild(card);
    });

    storageService.addToHistory({
      module: 'teams',
      description: `${participants.length} participantes → ${result.teams.length} equipos`
    });

    document.dispatchEvent(new CustomEvent('history-updated'));
  }
}
