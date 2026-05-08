/**
 * RouletteUI — DOM controller for the Interactive Roulette module.
 * Uses Canvas for drawing, requestAnimationFrame for animation.
 */
import { $, createElement, clearContainer } from '../utils/domHelpers.js';
import { RouletteService } from '../services/RouletteService.js';
import { storageService } from '../services/StorageService.js';
import { randomInt } from '../utils/mathUtils.js';

export class RouletteUI {
  constructor() {
    this.service = new RouletteService();
    this.items = [];
    this.currentRotation = 0;
    this.isSpinning = false;
    this.animationId = null;

    this.canvas = $('#roulette-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.optionsForm = $('#roulette-options-form');
    this.labelInput = $('#roulette-label');
    this.colorInput = $('#roulette-color');
    this.optionsList = $('#roulette-options-list');
    this.spinBtn = $('#roulette-spin-btn');
    this.resultOverlay = $('#roulette-result-overlay');
    this.resultText = $('#roulette-result-text');
    this.closeResultBtn = $('#roulette-close-result');

    this._setupCanvas();
    this._bindEvents();
    this._draw();
  }

  _setupCanvas() {
    const wrapper = this.canvas.parentElement;
    const size = wrapper.clientWidth || 300;
    this.canvas.width = size;
    this.canvas.height = size;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.center = size / 2;
    this.radius = size / 2 - 10;
  }

  _bindEvents() {
    this.optionsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this._addOption();
    });

    this.spinBtn.addEventListener('click', () => this._spin());
    this.closeResultBtn.addEventListener('click', () => {
      this.resultOverlay.close();
    });

    window.addEventListener('resize', () => {
      this._setupCanvas();
      this._draw();
    });
  }

  _addOption() {
    const label = this.labelInput.value.trim();
    const color = this.colorInput.value;
    if (!label) return;

    this.items.push({ label, color });
    this.labelInput.value = '';
    this._renderOptionsList();
    this._draw();
    this.spinBtn.disabled = this.items.length < 2;
  }

  _renderOptionsList() {
    clearContainer(this.optionsList);

    this.items.forEach((item, idx) => {
      const row = createElement('li', { className: 'roulette-option-entry' }, [
        createElement('i', {
          className: 'roulette-option-swatch',
          cssVars: { '--swatch-color': item.color }
        }, []),
        createElement('strong', {}, [item.label]),
        createElement('button', {
          className: 'btn btn--danger btn--sm',
          ariaLabel: `Eliminar ${item.label}`,
          onClick: () => {
            this.items.splice(idx, 1);
            this._renderOptionsList();
            this._draw();
            this.spinBtn.disabled = this.items.length < 2;
          }
        }, ['×'])
      ]);
      this.optionsList.appendChild(row);
    });
  }

  _draw() {
    const { ctx, center, radius } = this;
    if (!radius) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.items.length) {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#2d2d4a';
      ctx.fill();
      ctx.strokeStyle = '#3a3a5c';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#9595b5';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Agrega opciones', center, center);
      return;
    }

    const segments = this.service.calculateSegments(this.items);

    segments.forEach((seg) => {
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, seg.startAngle, seg.endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#0f0f1a';
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = (seg.startAngle + seg.endAngle) / 2;
      const textRadius = radius * 0.65;
      const x = center + Math.cos(midAngle) * textRadius;
      const y = center + Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(midAngle);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.label, 0, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f0f1a';
    ctx.fill();
    ctx.strokeStyle = '#6c5ce7';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  _spin() {
    if (this.isSpinning || this.items.length < 2) return;
    this.isSpinning = true;
    this.spinBtn.disabled = true;

    const targetIndex = randomInt(0, this.items.length - 1);
    const { finalAngle } = this.service.generateSpinAngle(
      this.currentRotation,
      targetIndex,
      this.items.length
    );

    const startRotation = this.currentRotation;
    const totalSpin = finalAngle - startRotation;
    const duration = 4000 + Math.random() * 2000;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

      this.currentRotation = startRotation + totalSpin * eased;
      this.canvas.style.transform = `rotate(${this.currentRotation}deg)`;

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        this.spinBtn.disabled = false;
        this._showResult(targetIndex);
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  _showResult(index) {
    const winner = this.items[index];
    this.resultText.textContent = winner.label;
    this.resultOverlay.showModal();

    storageService.addToHistory({
      module: 'roulette',
      description: `Ganador: ${winner.label}`
    });

    document.dispatchEvent(new CustomEvent('history-updated'));
  }
}
