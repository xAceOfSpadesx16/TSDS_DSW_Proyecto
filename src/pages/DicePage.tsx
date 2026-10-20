// =============================================================================
// DicePage (/dice)
//
// Tiradas de dados RPG: 5 botones (d4/d6/d8/d12/d20), modificador y resultado.
// Los números aleatorios viven en su propia pantalla (`/numbers`).
// =============================================================================

import { useEffect, useRef, useState } from 'react';

import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
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

  const [modifier, setModifier] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [displayRoll, setDisplayRoll] = useState(1);
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
  const [diceError, setDiceError] = useState<string | null>(null);

  const onRollDice = (sides: number) => {
    setDiceError(null);
    setDiceResult(null);
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
        setShaking(false);
        try {
          const { local, backend } = diceStrategy.execute({ sides, modifier });
          setDisplayRoll(local.rolls[0]);
          setDiceResult(local);
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
          setDiceError(err instanceof Error ? err.message : 'Tirada no válida.');
        }
      }
    };
    rafIdRef.current = requestAnimationFrame(tick);
  };

  return (
    <main
      className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-6 w-full mx-auto"
      role="main"
    >
      <section
        id="section-dice"
        aria-label="Dados RPG"
        className="min-w-0 animate-fade-in max-w-3xl mx-auto flex flex-col gap-4"
      >
        <h1 className="text-3xl font-bold">Dados RPG</h1>

        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {DICE_SIDES.map((sides) => (
              <button
                key={sides}
                type="button"
                className="dice-btn px-4 py-3 rounded-md bg-dark-bg-alt hover:bg-primary hover:text-light-inverse text-light-text text-lg font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
                data-sides={sides}
                onClick={() => onRollDice(sides)}
              >
                d{sides}
              </button>
            ))}
          </div>

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
              aria-live="polite"
            >
              {displayRoll}
            </output>
          </div>

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
            <p className="text-sm text-danger" role="alert">
              {diceError}
            </p>
          ) : null}
        </div>
      </section>

      <HistoryAside />
    </main>
  );
}
