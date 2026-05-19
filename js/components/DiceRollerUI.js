/**
 * DiceRollerUI — DOM controller for the Dice & Number Generator module.
 */
import { $, createElement, clearContainer } from '../utils/domHelpers.js';
import { DiceService } from '../services/DiceService.js';
import { storageService } from '../services/StorageService.js';

export class DiceRollerUI {
  constructor() {
    this.service = new DiceService();
    this.rolling = false;

    this.diceButtons = document.querySelectorAll('.dice-btn');
    this.modifierInput = $('#dice-modifier');
    this.diceResult = $('#dice-result');
    this.diceTotal = $('#dice-total');
    this.numberGenForm = $('#number-gen-form');
    this.numberGenResult = $('#number-gen-result');
    this.subtabRpg = $('#subtab-rpg');
    this.subtabNumbers = $('#subtab-numbers');
    this.panelRpg = $('#panel-rpg');
    this.panelNumbers = $('#panel-numbers');

    this._bindEvents();
  }

  _bindEvents() {
    this.diceButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const sides = parseInt(btn.dataset.sides, 10);
        this._rollDice(sides);
      });
    });

    this.numberGenForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this._generateNumbers();
    });

    this.subtabRpg.addEventListener('click', () => this._switchSubTab('rpg'));
    this.subtabNumbers.addEventListener('click', () => this._switchSubTab('numbers'));
  }

  _switchSubTab(tab) {
    const isRpg = tab === 'rpg';
    this.subtabRpg.setAttribute('aria-selected', String(isRpg));
    this.subtabNumbers.setAttribute('aria-selected', String(!isRpg));
    this.panelRpg.setAttribute('aria-hidden', String(!isRpg));
    this.panelNumbers.setAttribute('aria-hidden', String(isRpg));
  }

  _rollDice(sides) {
    if (this.rolling) return;
    this.rolling = true;

    const modifier = parseInt(this.modifierInput.value, 10) || 0;
    clearContainer(this.diceResult);
    clearContainer(this.diceTotal);

    const face = createElement('output', {
      className: 'w-20 h-20 flex items-center justify-center bg-dark-surface border-2 border-dark-border rounded-xl font-mono text-3xl font-extrabold animate-dice-shake',
      ariaLabel: `Tirando d${sides}`
    }, ['?']);
    this.diceResult.appendChild(face);

    const rollDuration = 500;
    const startTime = performance.now();

    const animateRoll = (now) => {
      const elapsed = now - startTime;
      if (elapsed < rollDuration) {
        face.textContent = Math.floor(Math.random() * sides) + 1;
        requestAnimationFrame(animateRoll);
      } else {
        const result = this.service.rollDice(sides, modifier);
        face.textContent = result.rolls[0];
        face.classList.remove('animate-dice-shake');
        face.classList.add('animate-fade-in');

        let totalText = `${result.total}`;
        if (modifier > 0) totalText += ` (${result.rolls[0]} + ${modifier})`;
        else if (modifier < 0) totalText += ` (${result.rolls[0]} - ${Math.abs(modifier)})`;

        const totalDisplay = createElement('p', {
          className: 'text-sm text-light-muted mt-2'
        }, [`Total: ${totalText}`]);
        this.diceTotal.appendChild(totalDisplay);

        this.rolling = false;

        storageService.addToHistory({
          module: 'dice',
          description: `d${sides}${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''} = ${result.total}`
        });

        document.dispatchEvent(new CustomEvent('history-updated'));
      }
    };

    requestAnimationFrame(animateRoll);
  }

  _generateNumbers() {
    const count = parseInt($('#num-count').value, 10);
    const min = parseInt($('#num-min').value, 10);
    const max = parseInt($('#num-max').value, 10);
    const unique = $('#num-unique').checked;

    clearContainer(this.numberGenResult);

    try {
      const numbers = unique
        ? this.service.generateUniqueNumbers(count, min, max)
        : this.service.generateNumbers(count, min, max);

      numbers.forEach((n) => {
        this.numberGenResult.appendChild(
          createElement('data', { className: 'inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-white font-bold text-lg animate-fade-in', value: String(n) }, [String(n)])
        );
      });

      storageService.addToHistory({
        module: 'numbers',
        description: `${count} números [${min}-${max}]${unique ? ' (únicos)' : ''}`
      });

      document.dispatchEvent(new CustomEvent('history-updated'));
    } catch (err) {
      this.numberGenResult.appendChild(
        createElement('p', { className: 'text-danger text-sm font-semibold w-full text-center' }, [err.message])
      );
    }
  }
}
