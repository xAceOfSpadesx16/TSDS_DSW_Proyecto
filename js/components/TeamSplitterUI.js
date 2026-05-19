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
    
    const baseBtn = 'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 disabled:opacity-50 px-2 py-1 text-xs'.split(' ');
    const activeBtn = 'bg-primary text-white hover:bg-primary-dark hover:-translate-y-[1px] hover:shadow-md'.split(' ');
    const inactiveBtn = 'bg-dark-surface text-light-text border border-dark-border hover:bg-dark-surface-hover hover:border-primary'.split(' ');

    this.modeCountBtn.className = '';
    this.modeCountBtn.classList.add(...baseBtn, ...(mode === 'count' ? activeBtn : inactiveBtn));
    
    this.modeSizeBtn.className = '';
    this.modeSizeBtn.classList.add(...baseBtn, ...(mode === 'size' ? activeBtn : inactiveBtn));
    
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

    const chip = createElement('li', { className: 'inline-flex items-center gap-1 px-2 py-1 bg-dark-surface border border-dark-border rounded-full text-sm' }, [
      `${a} ≠ ${b}`,
      createElement('button', {
        className: 'w-4 h-4 flex items-center justify-center rounded-full text-xs text-light-muted hover:bg-danger hover:text-white',
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
        className: 'rounded-lg p-6 bg-dark-surface border-l-4 animate-fade-in',
        style: `border-left-color: ${result.colors[i]}`
      }, [
        createElement('h3', {
          className: 'text-sm font-bold uppercase tracking-wider mb-2'
        }, [`Equipo ${i + 1}`]),
        createElement('p', { className: 'text-sm leading-relaxed' }, [
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
