// =============================================================================
// RoulettePage (/roulette)
//
// - Form para agregar opciones (label + color).
// - Canvas para la ruleta con animación de giro.
// - Modal `<dialog>` con el ganador.
//
// La estrategia (`RouletteStrategy`) calcula el ángulo final; acá solo se
// anima y se persiste el resultado en el historial.
// =============================================================================

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
import { calculateSegments, rouletteStrategy } from '../strategies/RouletteStrategy';
import { useHistoryStore } from '../store/historyStore';
import type { RouletteOption, RouletteResultLocal } from '../domain/contracts';

const DEFAULT_COLOR = '#6c5ce7';
const CANVAS_SIZE = 360;

function drawRoulette(
  canvas: HTMLCanvasElement,
  options: ReadonlyArray<RouletteOption>,
  rotation: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (options.length === 0) return;

  const segments = calculateSegments(options);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 8;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.translate(-centerX, -centerY);

  for (const segment of segments) {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, segment.startAngle, segment.endAngle);
    ctx.closePath();
    ctx.fillStyle = segment.color;
    ctx.fill();
    ctx.strokeStyle = '#0f0f1a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Etiqueta.
    ctx.save();
    ctx.translate(centerX, centerY);
    const midAngle = (segment.startAngle + segment.endAngle) / 2;
    ctx.rotate(midAngle);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(segment.label, radius - 12, 5);
    ctx.restore();
  }

  // Hub central.
  ctx.beginPath();
  ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#0f0f1a';
  ctx.fill();
  ctx.strokeStyle = '#a29bfe';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

export function RoulettePage() {
  const [options, setOptions] = useState<RouletteOption[]>([
    { label: 'Sí', color: DEFAULT_COLOR },
    { label: 'No', color: '#00cec9' },
  ]);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RouletteResultLocal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addHistory = useHistoryStore((s) => s.add);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const rotationRef = useRef(0);

  // Repintar cuando cambian las opciones.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawRoulette(canvas, options, rotationRef.current);
  }, [options]);

  // Repintar en resize.
  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawRoulette(canvas, options, rotationRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [options]);

  const onAddOption = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    setOptions((prev) => [...prev, { label: trimmed, color }]);
    setLabel('');
    setColor(DEFAULT_COLOR);
  };

  const onRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const onSpin = () => {
    if (spinning || options.length < 2) return;
    setError(null);
    const { local, backend } = rouletteStrategy.execute({ options });
    setResult(local);
    setSpinning(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const startRotation = rotationRef.current;
    const endRotation = startRotation + local.finalAngle;
    const startTime = performance.now();
    const duration = 4500;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = startRotation + (endRotation - startRotation) * eased;
      rotationRef.current = current;
      drawRoulette(canvas, options, current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setSpinning(false);
        dialogRef.current?.showModal();
        void addHistory({
          module: 'roulette',
          description: `Ganador: ${local.winner.label}`,
          record: {
            module_name: 'roulette',
            action: rouletteStrategy.actionLabel({ options }),
            payload: rouletteStrategy.buildPayload({ options }),
            result: backend,
          },
        });
      }
    };
    requestAnimationFrame(tick);
  };

  return (
    <main
      className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-6 w-full mx-auto"
      role="main"
    >
      <section
        id="section-roulette"
        aria-label="Ruleta de decisiones"
        className="min-w-0 animate-fade-in max-w-3xl mx-auto flex flex-col gap-4"
      >
        <h1 className="text-3xl font-bold">Ruleta de Decisiones</h1>

        <form
          id="roulette-options-form"
          onSubmit={onAddOption}
          className="bg-dark-surface border border-dark-border rounded-2xl p-4 flex flex-col gap-3"
        >
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <Field
              id="roulette-label"
              label="Opción"
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              placeholder="Ej: Opción A"
            />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-light-muted font-medium">Color</span>
              <input
                id="roulette-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.currentTarget.value)}
                className="w-12 h-10 rounded-md border border-dark-border bg-dark-surface"
              />
            </label>
          </div>
          <PrimaryButton type="submit" variant="primary">
            Agregar opción
          </PrimaryButton>
        </form>

        <ul
          id="roulette-options-list"
          className="flex flex-wrap gap-2"
          aria-label="Opciones cargadas"
        >
          {options.map((opt, i) => (
            <li
              key={`${opt.label}-${i}`}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-dark-surface border border-dark-border text-sm text-light-text"
            >
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: opt.color }}
                aria-hidden="true"
              />
              <span>{opt.label}</span>
              <button
                type="button"
                onClick={() => onRemoveOption(i)}
                aria-label={`Quitar opción ${opt.label}`}
                className="text-light-muted hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="roulette-wrapper relative">
            <canvas
              id="roulette-canvas"
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="rounded-full bg-dark-bg-alt border-2 border-dark-border shadow-2xl"
            />
          </div>

          <PrimaryButton
            id="roulette-spin-btn"
            variant="accent"
            onClick={onSpin}
            disabled={spinning || options.length < 2}
          >
            {spinning ? 'Girando...' : 'Girar ruleta'}
          </PrimaryButton>
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <dialog
          id="roulette-result-overlay"
          ref={dialogRef}
          className="rounded-2xl bg-dark-surface border border-dark-border text-light-text p-6 max-w-sm backdrop:bg-black/70"
        >
          <h2 className="text-xl font-bold mb-2">¡Ganador!</h2>
          <p
            id="roulette-result-text"
            className="text-3xl font-bold text-center my-4"
            style={{ color: result?.winner.color }}
          >
            {result?.winner.label}
          </p>
          <div className="flex justify-center">
            <PrimaryButton
              id="roulette-close-result"
              variant="primary"
              onClick={() => dialogRef.current?.close()}
            >
              Cerrar
            </PrimaryButton>
          </div>
        </dialog>
      </section>

      <HistoryAside />
    </main>
  );
}