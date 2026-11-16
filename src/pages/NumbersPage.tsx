import { useEffect, useState, type FormEvent } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
import {
  clearNumbersOptions,
  loadNumbersOptions,
  saveNumbersOptions,
} from '../lib/storage';
import { numbersStrategy } from '../strategies/NumbersStrategy';
import { useHistoryStore } from '../store/historyStore';
import {
  clampMin,
  readNumeric,
  toNumberOr,
  type NumericInput,
} from '../lib/numericInput';
import type { NumbersResult } from '../domain/contracts';

/** Página del generador de números. */
export function NumbersPage() {
  const [initialOptions] = useState(() => loadNumbersOptions());
  const [count, setCount] = useState<NumericInput>(initialOptions?.count ?? 5);
  const [min, setMin] = useState<NumericInput>(initialOptions?.min ?? 1);
  const [max, setMax] = useState<NumericInput>(initialOptions?.max ?? 50);
  const [unique, setUnique] = useState(initialOptions?.unique ?? true);
  const [result, setResult] = useState<NumbersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addHistory = useHistoryStore((s) => s.add);

  useEffect(() => {
    const countNum = clampMin(count, 1);
    const minNum = toNumberOr(min);
    const maxNum = toNumberOr(max);
    if (maxNum >= minNum) {
      saveNumbersOptions({
        count: countNum,
        min: minNum,
        max: maxNum,
        unique,
      });
    }
  }, [count, min, max, unique]);

  const onReset = () => {
    clearNumbersOptions();
    setCount(5);
    setMin(1);
    setMax(50);
    setUnique(true);
    setResult(null);
    setError(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const countNum = clampMin(count, 1);
    const minNum = toNumberOr(min);
    const maxNum = toNumberOr(max);
    setCount(countNum);
    setMin(minNum);
    setMax(maxNum);

    if (countNum < 1) {
      setError('La cantidad debe ser al menos 1.');
      return;
    }
    if (maxNum < minNum) {
      setError(`El máximo (${maxNum}) debe ser mayor o igual que el mínimo (${minNum}).`);
      return;
    }

    // Con `unique` no se pueden pedir más números que el rango disponible.
    const rangeSize = maxNum - minNum + 1;
    if (unique && countNum > rangeSize) {
      setError(
        `Pedís ${countNum} números únicos pero el rango ${minNum}-${maxNum} solo tiene ${rangeSize}.`,
      );
      return;
    }

    try {
      const input = { count: countNum, min: minNum, max: maxNum, unique };
      const { local, backend } = numbersStrategy.execute(input);
      setResult(local);
      void addHistory({
        module: 'numbers',
        description: numbersStrategy.actionLabel(input),
        record: {
          module_name: 'numbers',
          action: numbersStrategy.actionLabel(input),
          payload: numbersStrategy.buildPayload(input),
          result: backend,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron generar números.');
    }
  };

  return (
    <main className="workspace">
      <div className="page-head">
        <h1 tabIndex={-1} className="font-bold">
          Números aleatorios
        </h1>
        <HistoryAside />
      </div>

      <section
        id="section-numbers"
        aria-label="Generador de números"
        className="draw-grid animate-fade-in"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <form
            id="numbers-form"
            onSubmit={onSubmit}
            aria-describedby={error ? 'numbers-error' : undefined}
            className="panel flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-raised sm:p-6"
          >
            <Field
              id="numbers-count"
              label="Cantidad"
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(readNumeric(e.currentTarget.value))}
              onBlur={() => setCount(clampMin(count, 1))}
            />

            <fieldset className="grid max-w-[60ch] grid-cols-2 gap-3">
              <legend className="col-span-2 text-sm font-medium text-muted">
                Rango
              </legend>
              <Field
                id="numbers-min"
                label="Mínimo"
                type="number"
                value={min}
                onChange={(e) => setMin(readNumeric(e.currentTarget.value))}
                onBlur={() => setMin(toNumberOr(min))}
              />
              <Field
                id="numbers-max"
                label="Máximo"
                type="number"
                value={max}
                onChange={(e) => setMax(readNumeric(e.currentTarget.value))}
                onBlur={() => setMax(toNumberOr(max))}
              />
            </fieldset>

            <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
              <input
                id="numbers-unique"
                type="checkbox"
                checked={unique}
                onChange={(e) => setUnique(e.currentTarget.checked)}
                aria-describedby="numbers-unique-hint"
                className="h-5 w-5 rounded-md border-control bg-surface text-action focus-visible:outline focus-visible:outline-focus"
              />
              Sin repetición
            </label>
            <p id="numbers-unique-hint" className="text-xs text-muted">
              Los números no se repiten dentro del mismo sorteo.
            </p>

            <div className="flex flex-wrap gap-2">
              <PrimaryButton
                id="generate-numbers-btn"
                type="submit"
                variant="primary"
              >
                Generar
              </PrimaryButton>
              <PrimaryButton
                id="numbers-reset-btn"
                type="button"
                variant="ghost"
                onClick={onReset}
              >
                Restablecer
              </PrimaryButton>
            </div>
          </form>

          {error ? (
            <p id="numbers-error" className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="panel flex min-w-0 flex-col gap-3 rounded-2xl bg-surface p-4 shadow-raised sm:p-6">
          <h2 className="text-sm font-semibold text-muted">Resultado</h2>
          {result ? (
            <output
              id="numbers-result"
              className="rounded-2xl bg-surface p-4 text-center font-mono text-ink shadow-pressed"
            >
              {result.numbers.join(', ')}
            </output>
          ) : (
            <p className="text-sm text-muted italic">
              El resultado aparecerá acá.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
