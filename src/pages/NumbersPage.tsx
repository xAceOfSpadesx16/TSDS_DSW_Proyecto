// =============================================================================
// NumbersPage (/numbers)
//
// Formulario con `count`, `min`, `max` y el toggle de unicidad. Usa la
// `numbersStrategy` que ya existía (estaba registrada en la fábrica de
// estrategias pero sin pantalla) y registra el resultado con `addHistory`,
// igual que el resto de las páginas.
//
// Las validaciones del front cubren lo que la estrategia ya rechaza
// (count >= 1, max >= min) más el caso que la estrategia no puede saber:
// pedir más números únicos de los que caben en el rango.
// =============================================================================

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

    // Los mínimos se aplican al enviar, no en cada tecla.
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

    // Con `unique` no se pueden pedir más números distintos de los que
    // contiene el rango: el sorteo se quedaría sin combinaciones.
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
    <main
      className="workspace workspace-grid"
    >
      <section
        id="section-numbers"
        aria-label="Generador de números"
        className="w-full min-w-0 animate-fade-in flex flex-col gap-4"
      >
        <h1 tabIndex={-1} className="text-3xl font-bold">
          Números aleatorios
        </h1>

        <form
          id="numbers-form"
          onSubmit={onSubmit}
          aria-describedby={error ? 'numbers-error' : undefined}
          className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col gap-4"
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

          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="col-span-2 text-sm font-medium text-light-muted">
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

          <label className="inline-flex min-h-11 items-center gap-2 text-sm text-light-text">
            <input
              id="numbers-unique"
              type="checkbox"
              checked={unique}
              onChange={(e) => setUnique(e.currentTarget.checked)}
              className="h-5 w-5 rounded border-dark-border bg-dark-surface text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
            />
            Sin repetición
          </label>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton id="generate-numbers-btn" type="submit" variant="primary">
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

        {result ? (
          <output
            id="numbers-result"
            className="bg-dark-surface border border-dark-border rounded-md p-4 font-mono text-light-text text-center"
          >
            {result.numbers.join(', ')}
          </output>
        ) : null}
      </section>

      <HistoryAside />
    </main>
  );
}
