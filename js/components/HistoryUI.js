/**
 * HistoryUI — DOM controller for the history aside panel.
 */
import { $, createElement, clearContainer } from '../utils/domHelpers.js';
import { storageService } from '../services/StorageService.js';

export class HistoryUI {
  constructor() {
    this.historyList = $('#history-list');
    this.clearBtn = $('#clear-history-btn');
    this.aside = $('#history-aside');
    this.toggleBtn = $('#history-toggle-btn');

    this._bindEvents();
    this._render();
  }

  _bindEvents() {
    this.clearBtn.addEventListener('click', () => {
      storageService.clearHistory();
      this._render();
    });

    this.toggleBtn.addEventListener('click', () => {
      const isOpen = this.aside.classList.contains('app-aside--mobile-open');
      this.aside.classList.toggle('app-aside--mobile-open', !isOpen);
    });

    document.addEventListener('history-updated', () => this._render());
  }

  _render() {
    clearContainer(this.historyList);

    const history = storageService.load('history') || [];
    if (!history.length) {
      this.historyList.appendChild(
        createElement('p', {
          className: 'history-empty-state'
        }, ['Sin operaciones registradas.'])
      );
      return;
    }

    const moduleLabels = {
      teams: 'Equipos',
      weighted: 'Sorteo',
      roulette: 'Ruleta',
      dice: 'Dados',
      numbers: 'Números'
    };

    history.forEach((entry) => {
      const time = new Date(entry.timestamp);
      const timeStr = time.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

      const item = createElement('li', { className: 'history-item' }, [
        createElement('p', { className: 'history-item__title' }, [
          `[${moduleLabels[entry.module] || entry.module}]`
        ]),
        createElement('p', { className: 'history-item__detail' }, [entry.description]),
        createElement('time', { className: 'history-item__time' }, [timeStr])
      ]);

      this.historyList.appendChild(item);
    });
  }
}
