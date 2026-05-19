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
      const isOpen = this.aside.classList.contains('z-[90]');
      const mobileClasses = ['!block', '!fixed', '!bottom-0', '!left-0', '!right-0', '!max-h-[60vh]', '!border-t', '!border-dark-border', 'z-[90]', 'animate-fade-in', '!rounded-none', '!rounded-t-2xl'];
      
      if (isOpen) {
        this.aside.classList.remove(...mobileClasses);
      } else {
        this.aside.classList.add(...mobileClasses);
      }
    });

    document.addEventListener('history-updated', () => this._render());
  }

  _render() {
    clearContainer(this.historyList);

    const history = storageService.load('history') || [];
    if (!history.length) {
      this.historyList.appendChild(
        createElement('p', {
          className: 'text-sm text-light-muted italic text-center p-4'
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

      const item = createElement('li', { className: 'py-2 border-b border-dark-border last:border-0' }, [
        createElement('p', { className: 'text-sm font-semibold' }, [
          `[${moduleLabels[entry.module] || entry.module}]`
        ]),
        createElement('p', { className: 'text-xs text-light-muted mt-1' }, [entry.description]),
        createElement('time', { className: 'text-xs text-light-muted block mt-1 opacity-70' }, [timeStr])
      ]);

      this.historyList.appendChild(item);
    });
  }
}
