// =============================================================================
// DicePage (/dice)
//
// Dos pestañas (subtabs) accesibles:
// - "Dados RPG": 5 botones (d4/d6/d8/d12/d20), modificador y resultado.
// - "Números":    formulario con count/min/max/unique.
//
// Cada acción exitosa empuja una entrada al `historyStore` (que además la
// envía al backend si hay sesión).
// =============================================================================

import { useState, type FormEvent } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
import { diceStrategy } from '../strategies/DiceStrategy';
import { numbersStrategy } from '../strategies/NumbersStrategy';
import { useHistoryStore } from '../store/historyStore';
import type { DiceResult, NumbersResult } from '../domain/contracts';

type SubTab = 'rpg' | 'numbers';

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
  const [subtab, setSubtab] = useState<SubTab>('rpg');
  const addHistory = useHistoryStore((s) => s.add);

  // RPG state
  const [modifier, setModifier] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [displayRoll, setDisplayRoll] = useState(1);
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
  const [diceError, setDiceError] = useState<string | null>(null);

  // Numbers state
  const [count, setCount] = useState(5);
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(50);
  const [unique, setUnique] = useState(true);
  const [numbersResult, setNumbersResult] = useState<NumbersResult | null>(null);
  const [numbersError, setNumbersError] = useState<string | null>(null);

  const onRollDice = (sides: number) => {
    setDiceError(null);
    setDiceResult(null);
    setShaking(true);

    // Animación: alternar caras durante ~500ms, luego commitear el resultado real.
    const animationStart = performance.now();
    const tick = (now: number) => {
      if (now - animationStart < 500) {
        setDisplayRoll(1 + Math.floor(Math.random() * sides));
        requestAnimationFrame(tick);
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
    requestAnimationFrame(tick);
  };

  const onGenerateNumbers = (e: FormEvent) => {
    e.preventDefault();
    setNumbersError(null);
    setNumbersResult(null);
    try {
      const { local, backend } = numbersStrategy.execute({ count, min, max, unique });
      setNumbersResult(local);
      void addHistory({
        module: 'numbers',
        description: `${count} números [${min}-${max}] (${unique ? 'únicos' : 'con repetición'})`,
        record: {
          module_name: 'numbers',
          action: numbersStrategy.actionLabel({ count, min, max, unique }),
          payload: numbersStrategy.buildPayload({ count, min, max, unique }),
          result: backend,
        },
      });
    } catch (err) {
      setNumbersError(err instanceof Error ? err.message : 'Generación no válida.');
    }
  };

  return (
    <main
      className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-6 w-full mx-auto"
      role="main"
    >
      <section
        id="section-dice"
        aria-label="Dados y números"
        className="min-w-0 animate-fade-in max-w-3xl mx-auto flex flex-col gap-4"
      >
        <h1 className="text-3xl font-bold">Dados y Números</h1>

        {/* Subtabs */}
        <div role="tablist" aria-label="Dados y números" className="flex gap-2 border-b border-dark-border">
          <button
            id="subtab-rpg"
            role="tab"
            type="button"
            aria-selected={subtab === 'rpg'}
            aria-controls="panel-rpg"
            onClick={() => setSubtab('rpg')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
              subtab === 'rpg'
                ? 'bg-dark-surface text-light-text'
                : 'text-light-muted hover:text-light-text'
            }`}
          >
            Dados RPG
          </button>
          <button
            id="subtab-numbers"
            role="tab"
            type="button"
            aria-selected={subtab === 'numbers'}
            aria-controls="panel-numbers"
            onClick={() => setSubtab('numbers')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
              subtab === 'numbers'
                ? 'bg-dark-surface text-light-text'
                : 'text-light-muted hover:text-light-text'
            }`}
          >
            Números
          </button>
        </div>

        {/* Panel RPG */}
        <div
          id="panel-rpg"
          role="tabpanel"
          aria-hidden={subtab !== 'rpg'}
          aria-labelledby="subtab-rpg"
          className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col gap-4"
        >
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

        {/* Panel Numbers */}
        <div
          id="panel-numbers"
          role="tabpanel"
          aria-hidden={subtab !== 'numbers'}
          aria-labelledby="subtab-numbers"
          className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col gap-4"
        >
          <form id="number-gen-form" onSubmit={onGenerateNumbers} className="flex flex-col gap-3">
            <Field
              id="num-count"
              label="Cantidad"
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.currentTarget.value)))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="num-min"
                label="Mínimo"
                type="number"
                value={min}
                onChange={(e) => setMin(Number(e.currentTarget.value))}
              />
              <Field
                id="num-max"
                label="Máximo"
                type="number"
                value={max}
                onChange={(e) => setMax(Number(e.currentTarget.value))}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-light-text">
              <input
                id="num-unique"
                type="checkbox"
                checked={unique}
                onChange={(e) => setUnique(e.currentTarget.checked)}
                className="w-4 h-4 rounded border-dark-border bg-dark-surface text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
              />
              Sin repetición
            </label>

            <PrimaryButton type="submit" variant="primary">
              Generar
            </PrimaryButton>
          </form>

          {numbersError ? (
            <p className="text-sm text-danger" role="alert">
              {numbersError}
            </p>
          ) : null}

          {numbersResult ? (
            <output
              id="number-gen-result"
              className="bg-dark-bg-alt border border-dark-border rounded-md p-4 font-mono text-light-text text-center"
            >
              {numbersResult.numbers.join(', ')}
            </output>
          ) : null}
        </div>
      </section>

      <HistoryAside />
    </main>
  );
}