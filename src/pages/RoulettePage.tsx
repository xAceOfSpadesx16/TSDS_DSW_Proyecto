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
import { prefersReducedMotion } from '../lib/motion';
import {
  PAPER_INK,
  PAPER_SURFACE,
  ROULETTE_PALETTE,
  accessibleSegment,
  uniqueRouletteColor,
} from '../lib/palette';
import {
  clearRouletteOptions,
  loadRouletteOptions,
  saveRouletteOptions,
} from '../lib/storage';
import { calculateSegments, rouletteStrategy } from '../strategies/RouletteStrategy';
import { useHistoryStore } from '../store/historyStore';
import type { RouletteOption, RouletteResultLocal } from '../domain/contracts';

const DEFAULT_COLOR = ROULETTE_PALETTE[0];
const CANVAS_SIZE = 360;
const DEFAULT_OPTIONS: ReadonlyArray<RouletteOption> = [
  { label: 'Sí', color: ROULETTE_PALETTE[0] },
  { label: 'No', color: ROULETTE_PALETTE[1] },
];

/** Normaliza opciones restauradas: todo color válido y distinto. */
function normalizeOptionColors(
  options: ReadonlyArray<RouletteOption>,
): RouletteOption[] {
  const used = new Set<string>();
  return options.map((option) => {
    const color = uniqueRouletteColor(used, option.color);
    used.add(color.toLowerCase());
    return { ...option, color };
  });
}

function readToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function fitLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const measured = ctx.measureText?.(text)?.width;
  if (typeof measured !== 'number' || measured <= maxWidth) {
    return text;
  }
  let result = text;
  while (result.length > 1) {
    const candidate = `${result.slice(0, -1)}…`;
    const width = ctx.measureText?.(candidate)?.width;
    if (typeof width !== 'number' || width <= maxWidth) {
      return candidate;
    }
    result = result.slice(0, -1);
  }
  return result;
}

function drawRoulette(
  canvas: HTMLCanvasElement,
  options: ReadonlyArray<RouletteOption>,
  rotation: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (options.length === 0) return;

  const ink = readToken('--color-ink', PAPER_INK);
  const surface = readToken('--color-surface', PAPER_SURFACE);
  const segments = calculateSegments(options).map((segment) => {
    const accessible = accessibleSegment(segment.color);
    return {
      ...segment,
      fill: accessible.fill,
      labelColor: accessible.label,
    };
  });
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
    ctx.fillStyle = segment.fill;
    ctx.fill();
    ctx.strokeStyle = surface;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();

  // Las etiquetas se dibujan siempre horizontales, fuera de la rotación del
  // disco: así nunca quedan invertidas, ni siquiera después de un giro.
  ctx.save();
  ctx.fillStyle = ink;
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelRadius = radius * 0.64;
  const arcWidth =
    2 * Math.sin(Math.PI / Math.max(segments.length, 1)) * labelRadius;
  const maxWidth = Math.min(150, Math.max(48, arcWidth - 12));
  for (const segment of segments) {
    const midAngle = (segment.startAngle + segment.endAngle) / 2 + rotation;
    const x = centerX + Math.cos(midAngle) * labelRadius;
    const y = centerY + Math.sin(midAngle) * labelRadius;
    ctx.fillStyle = segment.labelColor;
    ctx.fillText(fitLabel(ctx, segment.label, maxWidth), x, y);
  }
  ctx.restore();

  // Hub central.
  ctx.beginPath();
  ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.strokeStyle = surface;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function RoulettePage() {
  const [initialOptions] = useState(() => loadRouletteOptions());
  const [options, setOptions] = useState<RouletteOption[]>(
    initialOptions
      ? normalizeOptionColors(initialOptions.options)
      : normalizeOptionColors(DEFAULT_OPTIONS),
  );
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RouletteResultLocal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 640,
  );
  const addHistory = useHistoryStore((s) => s.add);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    saveRouletteOptions(options);
  }, [options]);

  const onReset = () => {
    clearRouletteOptions();
    setOptions(normalizeOptionColors(DEFAULT_OPTIONS));
    setLabel('');
    setColor(DEFAULT_COLOR);
    setResult(null);
    setError(null);
    rotationRef.current = 0;
    dialogRef.current?.close?.();
  };

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
    setOptions((prev) => {
      const used = new Set(prev.map((option) => option.color.toLowerCase()));
      const preferred = uniqueRouletteColor(used, color);
      return [...prev, { label: trimmed, color: preferred }];
    });
    setLabel('');
    setColor(DEFAULT_COLOR);
  };

  const onRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const rafIdRef = useRef<number>(0);

  // Cancela cualquier animación pendiente al desmontar (evita fugas de rAF).
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const onSpin = () => {
    if (spinning || options.length < 2) return;
    setError(null);
    try {
      const { local, backend } = rouletteStrategy.execute({ options });
      setResult(local);
      setSpinning(true);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const startRotation = rotationRef.current;
      const endRotation = startRotation + local.finalAngle;

      const finishSpin = () => {
        rotationRef.current = endRotation;
        drawRoulette(canvas, options, endRotation);
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
      };

      if (prefersReducedMotion()) {
        finishSpin();
        return;
      }

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
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          finishSpin();
        }
      };
      rafIdRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo girar la ruleta.');
    }
  };

  return (
    <main
      className="workspace workspace-grid"
    >
      <section
        id="section-roulette"
        aria-label="Ruleta de decisiones"
        className="w-full min-w-0 animate-fade-in flex flex-col gap-4"
      >
        <h1 tabIndex={-1} className="font-bold">
          Ruleta de Decisiones
        </h1>

        <details
          id="roulette-options-details"
          open={optionsOpen}
          onToggle={(event) => setOptionsOpen(event.currentTarget.open)}
          className="rounded-2xl border border-control bg-surface shadow-raised"
        >
          <summary className="flex min-h-11 cursor-pointer items-center justify-between rounded-2xl px-4 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-focus">
            Opciones de la ruleta
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted">
                {options.length}
              </span>
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 transition-transform ${optionsOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </summary>
          <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
            <form
              id="roulette-options-form"
              onSubmit={onAddOption}
              className="flex flex-col gap-3"
            >
              <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <legend className="sr-only">Nueva opción</legend>
                <Field
                  id="roulette-label"
                  label="Opción"
                  type="text"
                  required
                  disabled={spinning}
                  value={label}
                  onChange={(e) => setLabel(e.currentTarget.value)}
                  placeholder="Ej: Opción A"
                />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted font-medium">Color</span>
                  <input
                    id="roulette-color"
                    type="color"
                    disabled={spinning}
                    value={color}
                    onChange={(e) => setColor(e.currentTarget.value)}
                    className="h-11 w-12 rounded-md border border-control bg-surface disabled:bg-surface-sunken disabled:cursor-not-allowed"
                  />
                </label>
              </fieldset>
              <PrimaryButton type="submit" variant="primary" disabled={spinning}>
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
                  className="inline-flex max-w-full min-w-0 items-center gap-2 px-3 py-1 rounded bg-surface border border-control text-sm text-ink shadow-low"
                >
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: opt.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words">{opt.label}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveOption(i)}
                    disabled={spinning}
                    aria-label={`Quitar opción ${opt.label}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:text-danger focus-visible:outline focus-visible:outline-focus disabled:bg-surface-sunken disabled:text-muted disabled:cursor-not-allowed"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex justify-end">
              <PrimaryButton
                id="roulette-reset-btn"
                type="button"
                variant="ghost"
                onClick={onReset}
                disabled={spinning}
              >
                Restablecer
              </PrimaryButton>
            </div>
          </div>
        </details>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="roulette-wrapper relative w-full max-w-[250px] sm:max-w-[360px]">
            <canvas
              id="roulette-canvas"
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              role="img"
              aria-label={`Ruleta de decisiones con ${options.length} opciones`}
              className="h-auto w-full max-w-[250px] sm:max-w-[360px] rounded-full bg-surface border-2 border-control shadow-high"
            />
          </div>

          <PrimaryButton
            id="roulette-spin-btn"
            variant="accent"
            onClick={onSpin}
            disabled={spinning || options.length < 2}
            aria-describedby={error ? 'roulette-error' : undefined}
          >
            {spinning ? 'Girando…' : 'Girar ruleta'}
          </PrimaryButton>
        </div>

        {error ? (
          <p id="roulette-error" className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <dialog
          id="roulette-result-overlay"
          ref={dialogRef}
          aria-labelledby="roulette-result-title"
          aria-describedby="roulette-result-text"
          className="rounded-2xl bg-surface border border-control text-ink p-6 max-w-sm shadow-high backdrop:bg-scrim"
          onClose={() =>
            document.getElementById('roulette-spin-btn')?.focus()
          }
        >
          <h2 id="roulette-result-title" className="text-xl font-bold mb-2">
            ¡Ganador!
          </h2>
          <p
            id="roulette-result-text"
            className="my-4 break-words text-center font-mono text-3xl font-bold text-ink"
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