// =============================================================================
// DicePage (/dice)
//
// Tiradas de dados RPG: 5 botones (d4/d6/d8/d12/d20), modificador y resultado.
// Los números aleatorios viven en su propia pantalla (`/numbers`).
// =============================================================================

import { useEffect, useRef, useState } from 'react';

import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
import { PrimaryButton } from '../components/PrimaryButton';
import { prefersReducedMotion } from '../lib/motion';
import { clearDiceOptions, loadDiceOptions, saveDiceOptions } from '../lib/storage';
import { diceStrategy } from '../strategies/DiceStrategy';
import { useHistoryStore } from '../store/historyStore';
import type { DiceResult } from '../domain/contracts';

const DICE_SIDES: ReadonlyArray<number> = [4, 6, 8, 12, 20];

function describeDice(result: DiceResult, sides: number): string {
  const modifierStr =
    result.modifier === 0
      ? ''
      : `${result.modifier >= 0 ? '+' : ''}${result.modifier}`;
  if (result.formula) {
    return `${result.formula} = ${result.total}`;
  }
  if (result.rolls.length === 1) {
    return `d${sides}${modifierStr} = ${result.total}`;
  }
  return `${result.rolls.length}d${sides}${modifierStr} = ${result.total}`;
}

export function DicePage() {
  const addHistory = useHistoryStore((s) => s.add);
  const rafIdRef = useRef<number>(0);

  // Cancela la animación de tirada si la página se desmonta en medio del
  // "shake" (evita un setState sobre un componente desmontado / fuga de rAF).
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const [initialOptions] = useState(() => loadDiceOptions());
  const [modifier, setModifier] = useState(initialOptions?.modifier ?? 0);
  const [lastSides, setLastSides] = useState<number | null>(
    initialOptions?.lastSides ?? null,
  );
  const [shaking, setShaking] = useState(false);
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
  const [diceError, setDiceError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    saveDiceOptions({ lastSides, modifier });
  }, [lastSides, modifier]);

  const onReset = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    clearDiceOptions();
    setModifier(0);
    setLastSides(null);
    setShaking(false);
    setDisplayRoll(null);
    setDiceResult(null);
    setDiceError(null);
    setAnnouncement('');
  };

  const commitRoll = (sides: number) => {
    setShaking(false);
    try {
      const { local, backend } = diceStrategy.execute({ sides, modifier });
      setDisplayRoll(local.rolls[0]);
      setDiceResult(local);
      setAnnouncement(`Total: ${local.total}`);
      void addHistory({
        module: 'dice',
        description: describeDice(local, sides),
        record: {
          module_name: 'dice',
          action: diceStrategy.actionLabel({ sides, modifier }),
          payload: diceStrategy.buildPayload({ sides, modifier }),
          result: backend,
        },
      });
    } catch (err) {
      setDisplayRoll(null);
      setAnnouncement('');
      setDiceError(err instanceof Error ? err.message : 'Tirada no válida.');
    }
  };

  const onRollDice = (sides: number) => {
    setDiceError(null);
    setDiceResult(null);
    setDisplayRoll(null);
    setLastSides(sides);

    if (prefersReducedMotion()) {
      commitRoll(sides);
      return;
    }

    setShaking(true);

    // Animación: alternar caras durante ~500ms, luego commitear el resultado
    // real. El tiempo se mide con el reloj de `requestAnimationFrame`: el
    // primer timestamp recibido marca el inicio. No se usa `performance.now()`
    // porque mezcla dos orígenes de tiempo (el del rAF y el de pared) y la
    // duración pasaría a depender de cuándo arrancó el proceso.
    let animationStart: number | null = null;
    const tick = (now: number) => {
      if (animationStart === null) {
        animationStart = now;
      }
      if (now - animationStart < 500) {
        setDisplayRoll(1 + Math.floor(Math.random() * sides));
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        commitRoll(sides);
      }
    };
    rafIdRef.current = requestAnimationFrame(tick);
  };

  return (
    <main
      className="workspace workspace-grid"
    >
      <section
        id="section-dice"
        aria-label="Dados RPG"
        className="w-full min-w-0 animate-fade-in flex flex-col gap-4"
      >
        <h1 tabIndex={-1} className="text-3xl font-bold">
          Dados RPG
        </h1>

        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col gap-4">
          <fieldset
            className="flex min-w-0 flex-col gap-2"
            aria-describedby={diceError ? 'dice-error' : undefined}
          >
            <legend className="text-sm font-medium text-light-muted">Dado</legend>
            <div className="flex flex-wrap gap-2">
              {DICE_SIDES.map((sides) => (
                <button
                  key={sides}
                  type="button"
                  className={`dice-btn px-4 py-3 rounded-md text-lg font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light ${
                    lastSides === sides
                      ? 'bg-primary text-white'
                      : 'bg-dark-bg-alt text-light-text hover:bg-primary hover:text-white'
                  }`}
                  data-sides={sides}
                  data-active={lastSides === sides}
                  onClick={() => onRollDice(sides)}
                >
                  d{sides}
                </button>
              ))}
            </div>
          </fieldset>

          <Field
            id="dice-modifier"
            label="Modificador"
            type="number"
            value={modifier}
            onChange={(e) => setModifier(Number(e.currentTarget.value))}
          />

          <div className="flex items-center justify-center gap-4 py-6">
            <output
              id="dice-result"
              className={`w-32 h-32 flex items-center justify-center text-6xl font-bold rounded-xl bg-dark-bg-alt border-2 border-primary text-primary-light ${
                shaking ? 'animate-dice-shake' : ''
              }`}
              aria-hidden="true"
            >
              {displayRoll ?? ''}
            </output>
          </div>

          <p
            id="dice-announcement"
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {announcement}
          </p>

          {diceResult ? (
            <div className="text-center text-lg">
              <output id="dice-total" className="font-bold text-light-text">
                {diceResult.rolls.length === 1
                  ? `Total: ${diceResult.total}${
                      diceResult.modifier !== 0
                        ? ` (${diceResult.rolls[0]} ${diceResult.modifier >= 0 ? '+' : ''}${diceResult.modifier})`
                        : ''
                    }`
                  : `Total: ${diceResult.total} (tiradas: ${diceResult.rolls.join(', ')})`}
              </output>
            </div>
          ) : null}

          {diceError ? (
            <p id="dice-error" className="text-sm text-danger" role="alert">
              {diceError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <PrimaryButton
              id="dice-reset-btn"
              type="button"
              variant="ghost"
              onClick={onReset}
            >
              Restablecer
            </PrimaryButton>
          </div>
        </div>
      </section>

      <HistoryAside />
    </main>
  );
}
