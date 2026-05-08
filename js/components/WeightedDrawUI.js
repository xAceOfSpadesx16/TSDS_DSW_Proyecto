/**
 * WeightedDrawUI — DOM controller for the Weighted Random module.
 */
import { $, createElement, clearContainer } from '../utils/domHelpers.js';
import { WeightedDrawService } from '../services/WeightedDrawService.js';
import { storageService } from '../services/StorageService.js';

export class WeightedDrawUI {
  constructor() {
    this.service = new WeightedDrawService();
    this.entries = [];
    this.originalEntries = [];

    this.form = $('#weighted-form');
    this.nameInput = $('#weighted-name');
    this.weightInput = $('#weighted-weight');
    this.listContainer = $('#weighted-list');
    this.drawBtn = $('#weighted-draw-btn');
    this.resetBtn = $('#weighted-reset-btn');
    this.autoRemoveToggle = $('#weighted-auto-remove');
    this.resultOutput = $('#weighted-result');

    this._bindEvents();
  }

  _bindEvents() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._addEntry();
    });

    this.drawBtn.addEventListener('click', () => this._draw());
    this.resetBtn.addEventListener('click', () => this._reset());
  }

  _addEntry() {
    const name = this.nameInput.value.trim();
    const weight = parseInt(this.weightInput.value, 10) || 1;

    if (!name) return;

    const entry = { name, weight };
    this.entries.push(entry);
    if (!this.originalEntries.length) {
      this.originalEntries = [...this.entries];
    } else {
      this.originalEntries.push(entry);
    }

    this.nameInput.value = '';
    this.weightInput.value = '1';
    this._renderList();
    this.drawBtn.disabled = false;
  }

  _renderList() {
    clearContainer(this.listContainer);
    const maxWeight = Math.max(...this.entries.map((e) => e.weight), 1);

    this.entries.forEach((entry, idx) => {
      const barWidth = (entry.weight / maxWeight) * 100;
      const row = createElement('li', { className: 'weighted-entry' }, [
        createElement('strong', {}, [entry.name]),
        createElement('output', {
          className: 'weighted-entry__bar weighted-entry__bar--filled',
          cssVars: { '--bar-width': `${barWidth}%` },
          ariaLabel: `Peso: ${entry.weight}`
        }, []),
        createElement('button', {
          className: 'btn btn--danger btn--sm',
          ariaLabel: `Eliminar ${entry.name}`,
          onClick: () => {
            this.entries.splice(idx, 1);
            this.originalEntries = this.originalEntries.filter((e) => e !== entry);
            this._renderList();
            this.drawBtn.disabled = !this.entries.length;
          }
        }, ['×'])
      ]);

      this.listContainer.appendChild(row);
    });
  }

  _draw() {
    if (!this.entries.length) return;

    const autoRemove = this.autoRemoveToggle.checked;
    const result = this.service.draw(this.entries, { autoRemove });

    clearContainer(this.resultOutput);
    const display = createElement('article', { className: 'result-display animate-pulse' }, [
      createElement('p', { className: 'result-display__value' }, [result.winner.name]),
      createElement('p', { className: 'result-display__label' }, [
        `Probabilidad: ${result.probability}%`
      ])
    ]);
    this.resultOutput.appendChild(display);

    if (autoRemove) {
      this.entries = result.remainingEntries;
      this._renderList();
      this.drawBtn.disabled = !this.entries.length;
    }

    storageService.addToHistory({
      module: 'weighted',
      description: `Ganador: ${result.winner.name} (${result.probability}%)`
    });

    document.dispatchEvent(new CustomEvent('history-updated'));
  }

  _reset() {
    this.entries = [...this.originalEntries];
    this._renderList();
    clearContainer(this.resultOutput);
    this.drawBtn.disabled = !this.entries.length;
  }
}
