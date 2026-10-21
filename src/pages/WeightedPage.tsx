// =============================================================================
// WeightedPage (/weighted)
//
// Sorteo con pesos proporcionales. Permite:
// - Agregar, editar y quitar entradas (nombre + peso).
// - Cargar una lista en bloque ("Ana, 3" por línea).
// - Ver el porcentaje de cada fila y el peso total antes de sortear.
// - Sortear; opcionalmente auto-elimina ganadores.
// - Reiniciar la lista original o restablecer todo.
// =============================================================================

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
import { prefersReducedMotion } from '../lib/motion';
import {
  clearWeightedOptions,
  loadWeightedOptions,
  saveWeightedOptions,
} from '../lib/storage';
import {
  computeWeightedPercentages,
  parseWeightedBulk,
  weightedStrategy,
} from '../strategies/WeightedStrategy';
import { useHistoryStore } from '../store/historyStore';
import { readNumeric, type NumericInput } from '../lib/numericInput';
import type { WeightedEntry, WeightedResultLocal } from '../domain/contracts';

/**
 * Peso válido: entero entre 1 y 100. El vacío se interpreta como 1, igual
 * que el mínimo del formulario de alta. Devuelve `null` si el valor no es
 * un entero válido (por ejemplo 3.5), para no persistir datos que el
 * validador de `storage.ts` rechazaría al recargar.
 */
function parseWeight(value: NumericInput): number | null {
  if (value === '') return 1;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 100) {
    return null;
  }
  return numeric;
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function WeightedPage() {
  const [initialOptions] = useState(() => loadWeightedOptions());
  const [entries, setEntries] = useState<WeightedEntry[]>(
    initialOptions?.entries ?? [],
  );
  const [originalEntries, setOriginalEntries] = useState<WeightedEntry[]>(
    initialOptions?.originalEntries ?? [],
  );
  const [name, setName] = useState('');
  const [weight, setWeight] = useState<NumericInput>(1);
  const [autoRemove, setAutoRemove] = useState(initialOptions?.autoRemove ?? false);
  const [result, setResult] = useState<WeightedResultLocal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState<NumericInput>(1);
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [addWeightError, setAddWeightError] = useState<string | null>(null);
  const [editWeightError, setEditWeightError] = useState<string | null>(null);
  const [focusParticipantsHeading, setFocusParticipantsHeading] = useState(false);
  const lastEditingIndexRef = useRef<number | null>(null);
  const addHistory = useHistoryStore((s) => s.add);

  // Al entrar en edición el foco va al nombre; al salir vuelve al botón de
  // edición de esa fila. Quitar mueve el foco al encabezado de la lista.
  useEffect(() => {
    if (editingIndex !== null) {
      lastEditingIndexRef.current = editingIndex;
      const input = document.getElementById(
        `weighted-edit-name-${editingIndex}`,
      ) as HTMLInputElement | null;
      input?.focus();
      input?.select();
      return;
    }
    const previous = lastEditingIndexRef.current;
    if (previous !== null) {
      lastEditingIndexRef.current = null;
      document.getElementById(`weighted-edit-btn-${previous}`)?.focus();
    }
  }, [editingIndex]);

  useEffect(() => {
    if (!focusParticipantsHeading) return;
    document.getElementById('weighted-participants-heading')?.focus();
    setFocusParticipantsHeading(false);
  }, [focusParticipantsHeading]);

  useEffect(() => {
    saveWeightedOptions({ entries, originalEntries, autoRemove });
  }, [entries, originalEntries, autoRemove]);

  // Al sortear, el resultado se hace visible y el encabezado recibe el foco.
  useEffect(() => {
    if (!result) return;
    const heading = document.getElementById('weighted-result-heading');
    const resultElement = document.getElementById('weighted-result');
    if (!heading || !resultElement) return;
    if (typeof resultElement.scrollIntoView === 'function') {
      resultElement.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
    heading.focus({ preventScroll: true });
  }, [result]);

  const totalWeight = entries.reduce((acc, entry) => acc + entry.weight, 0);
  const percentages = computeWeightedPercentages(entries);

  const describedBy =
    [
      entries.length === 0 ? 'weighted-draw-hint' : null,
      error ? 'weighted-error' : null,
    ]
      .filter((value): value is string => value !== null)
      .join(' ') || undefined;

  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    setError(null);
    setResult(null);
    if (!trimmed) {
      setError('Escribí un nombre para agregar el participante.');
      return;
    }
    const weightNum = parseWeight(weight);
    if (weightNum === null) {
      setAddWeightError('El peso debe ser un número entero entre 1 y 100.');
      return;
    }
    setAddWeightError(null);
    setWeight(weightNum);
    setEntries((prev) => [...prev, { name: trimmed, weight: weightNum }]);
    setOriginalEntries((prev) => [
      ...prev,
      { name: trimmed, weight: weightNum },
    ]);
    setName('');
    setWeight(1);
  };

  const onStartEdit = (index: number) => {
    const entry = entries[index];
    if (!entry) return;
    setEditingIndex(index);
    setEditName(entry.name);
    setEditWeight(entry.weight);
    setEditWeightError(null);
    setError(null);
    setResult(null);
  };

  const onCancelEdit = () => {
    setEditingIndex(null);
    setEditName('');
    setEditWeight(1);
    setEditWeightError(null);
  };

  const onSaveEdit = () => {
    if (editingIndex === null) return;
    const previous = entries[editingIndex];
    if (!previous) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setError('El nombre no puede quedar vacío.');
      return;
    }
    const weightNum = parseWeight(editWeight);
    if (weightNum === null) {
      setEditWeightError('El peso debe ser un número entero entre 1 y 100.');
      return;
    }
    const updated: WeightedEntry = { name: trimmed, weight: weightNum };

    setEntries((prev) =>
      prev.map((entry, index) => (index === editingIndex ? updated : entry)),
    );
    setOriginalEntries((prev) => {
      const originalIndex = prev.findIndex(
        (entry) => entry.name === previous.name && entry.weight === previous.weight,
      );
      if (originalIndex === -1) return prev;
      return prev.map((entry, index) =>
        index === originalIndex ? updated : entry,
      );
    });
    setEditingIndex(null);
    setEditName('');
    setEditWeight(1);
    setEditWeightError(null);
    setError(null);
    setResult(null);
  };

  const onRemove = (index: number) => {
    const entry = entries[index];
    if (!entry) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setOriginalEntries((prev) => {
      const originalIndex = prev.findIndex(
        (candidate) =>
          candidate.name === entry.name && candidate.weight === entry.weight,
      );
      if (originalIndex === -1) return prev;
      return prev.filter((_, i) => i !== originalIndex);
    });
    setEditingIndex(null);
    setError(null);
    setResult(null);
    setFocusParticipantsHeading(true);
  };

  const onBulkLoad = () => {
    setError(null);
    setResult(null);
    setAddWeightError(null);
    setEditWeightError(null);
    const parsed = parseWeightedBulk(bulkText);
    if (parsed.entries.length === 0 && parsed.invalid.length === 0) {
      setBulkError('Pegá al menos una línea para cargar participantes.');
      setBulkNotice(null);
      return;
    }

    if (parsed.entries.length > 0) {
      setEntries((prev) => [...prev, ...parsed.entries]);
      setOriginalEntries((prev) => [...prev, ...parsed.entries]);
      setBulkNotice(
        `Se ${parsed.entries.length === 1 ? 'agregó 1 participante' : `agregaron ${parsed.entries.length} participantes`}.`,
      );
    } else {
      setBulkNotice(null);
    }

    setBulkText(parsed.invalid.map((item) => item.line).join('\n'));
    setBulkError(
      parsed.invalid.length === 0
        ? null
        : parsed.invalid
            .map((item) => `"${item.line}": ${item.reason}`)
            .join(' '),
    );
  };

  const onDraw = () => {
    setError(null);
    setResult(null);
    setEditingIndex(null);
    if (entries.length === 0) {
      setError('Agregá al menos un participante antes de sortear.');
      return;
    }
    try {
      const { local, backend } = weightedStrategy.execute({
        entries,
        autoRemove,
      });
      setResult(local);
      if (autoRemove) {
        setEntries(local.remainingEntries);
      }
      void addHistory({
        module: 'weighted',
        description: `Ganador: ${local.winner.name} (${local.probability}%)`,
        record: {
          module_name: 'weighted',
          action: weightedStrategy.actionLabel({ entries, autoRemove }),
          payload: weightedStrategy.buildPayload({ entries, autoRemove }),
          result: backend,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sortear.');
    }
  };

  const onReset = () => {
    setEntries(originalEntries);
    setEditingIndex(null);
    setResult(null);
    setError(null);
    setBulkError(null);
    setBulkNotice(null);
    setAddWeightError(null);
    setEditWeightError(null);
  };

  const onClear = () => {
    clearWeightedOptions();
    setEntries([]);
    setOriginalEntries([]);
    setName('');
    setWeight(1);
    setAutoRemove(false);
    setResult(null);
    setError(null);
    setEditingIndex(null);
    setBulkText('');
    setBulkError(null);
    setBulkNotice(null);
    setAddWeightError(null);
    setEditWeightError(null);
  };

  return (
    <main className="workspace workspace-grid">
      <section
        id="section-weighted"
        aria-label="Sorteo con pesos"
        className="w-full min-w-0 animate-fade-in flex flex-col gap-3 sm:gap-4"
      >
        <h1 tabIndex={-1} className="font-bold">
          Sorteo con Pesos
        </h1>

        <form
          id="weighted-form"
          onSubmit={onAdd}
          className="panel bg-surface rounded-2xl shadow-raised p-4"
        >
          <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <legend className="sr-only">Agregar participante</legend>
            <Field
              id="weighted-name"
              label="Nombre"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Ej: Ana"
            />
            <Field
              id="weighted-weight"
              label="Peso"
              type="number"
              min={1}
              max={100}
              step={1}
              hint="1 a 100: cuanto más peso, más probabilidad."
              error={addWeightError ?? undefined}
              value={weight}
              onChange={(e) => {
                setWeight(readNumeric(e.currentTarget.value));
                setAddWeightError(null);
              }}
            />
            <PrimaryButton type="submit" variant="primary">
              + Agregar
            </PrimaryButton>
          </fieldset>
        </form>

        <details
          id="weighted-bulk-details"
          className="panel bg-surface rounded-2xl shadow-raised"
        >
          <summary className="flex min-h-11 cursor-pointer items-center rounded-full border border-control bg-surface px-4 text-sm font-semibold text-ink shadow-low focus-visible:outline focus-visible:outline-focus">
            Carga masiva
          </summary>
          <div className="flex min-w-0 flex-col gap-2 px-4 pb-4 pt-1">
            <label
              htmlFor="weighted-bulk"
              className="text-sm font-medium text-muted"
            >
              Una persona por línea
            </label>
            <textarea
              id="weighted-bulk"
              rows={4}
              value={bulkText}
              onChange={(event) => {
                setBulkText(event.currentTarget.value);
                setBulkError(null);
                setBulkNotice(null);
              }}
              aria-describedby={
                bulkError
                  ? 'weighted-bulk-hint weighted-bulk-error'
                  : 'weighted-bulk-hint'
              }
              placeholder={'Ana, 3\nBruno, 5\nCarla'}
              className="w-full min-w-0 rounded-md border border-control bg-surface px-3 py-2 text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-focus"
            />
            <p id="weighted-bulk-hint" className="text-xs text-muted">
              Formato: <code>Ana</code> o <code>Ana, 3</code>. El peso es
              opcional y va de 1 a 100. Las líneas vacías se ignoran.
            </p>
            <PrimaryButton type="button" variant="ghost" onClick={onBulkLoad}>
              Cargar lista
            </PrimaryButton>
            {bulkNotice ? (
              <p role="status" className="text-xs text-success">
                {bulkNotice}
              </p>
            ) : null}
            {bulkError ? (
              <p
                id="weighted-bulk-error"
                role="alert"
                className="break-words text-xs text-danger [overflow-wrap:anywhere]"
              >
                {bulkError}
              </p>
            ) : null}
          </div>
        </details>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="weighted-participants-heading"
            tabIndex={-1}
            className="text-lg font-bold"
          >
            Participantes
          </h2>
          <p id="weighted-total" className="text-sm text-muted">
            Peso total: {totalWeight} · {entries.length}{' '}
            {entries.length === 1 ? 'participante' : 'participantes'}
          </p>
        </div>

        <ul
          id="weighted-list"
          className="flex min-w-0 flex-col gap-2"
          aria-label="Participantes cargados"
        >
          {entries.length === 0 ? (
            <li className="text-sm text-muted italic">
              Sin participantes cargados.
            </li>
          ) : null}
          {entries.map((entry, index) => {
            const percent = percentages[index] ?? 0;
            return (
              <li
                key={`${entry.name}-${index}`}
                data-weighted-row
                className="panel flex min-w-0 flex-col gap-2 rounded-2xl bg-surface p-3 shadow-low"
              >
                {editingIndex === index ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <Field
                      id={`weighted-edit-name-${index}`}
                      label="Nombre del participante"
                      type="text"
                      value={editName}
                      onChange={(event) => setEditName(event.currentTarget.value)}
                    />
                    <Field
                      id={`weighted-edit-weight-${index}`}
                      label="Peso del participante"
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      hint="1 a 100; entero."
                      error={editWeightError ?? undefined}
                      value={editWeight}
                      onChange={(event) => {
                        setEditWeight(readNumeric(event.currentTarget.value));
                        setEditWeightError(null);
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <PrimaryButton type="button" onClick={onSaveEdit}>
                        Guardar
                      </PrimaryButton>
                      <PrimaryButton
                        type="button"
                        variant="ghost"
                        onClick={onCancelEdit}
                      >
                        Cancelar
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 break-words font-semibold text-ink">
                        {entry.name}
                      </span>
                      <span
                        data-weighted-percent
                        className="shrink-0 font-mono text-muted"
                      >
                        {formatPercent(percent)}%
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted">
                        peso {entry.weight}
                      </span>
                      <div className="ml-auto flex shrink-0 gap-1">
                        <button
                          id={`weighted-edit-btn-${index}`}
                          type="button"
                          aria-label={`Editar ${entry.name}`}
                          onClick={() => onStartEdit(index)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-control bg-surface text-muted shadow-low transition-colors hover:bg-surface-hover hover:text-action active:shadow-pressed focus-visible:outline focus-visible:outline-focus"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden="true"
                          >
                            <path
                              d="m4 14 .8 3.2L8 16.4l8-8-3.4-3.4-8 8Z"
                              strokeLinejoin="round"
                            />
                            <path d="m11.8 6.2 3.4 3.4" strokeLinecap="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label={`Quitar ${entry.name}`}
                          onClick={() => onRemove(index)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-control bg-surface text-muted shadow-low transition-colors hover:bg-surface-hover hover:text-danger active:shadow-pressed focus-visible:outline focus-visible:outline-focus"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path
                              d="m5 5 10 10M15 5 5 15"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div
                      data-weighted-track
                      className="h-2.5 w-full overflow-hidden rounded-full border border-control bg-surface-sunken shadow-pressed"
                      aria-hidden="true"
                    >
                      <div
                        data-weighted-bar
                        className="h-full rounded-full bg-action"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton
              id="weighted-draw-btn"
              variant="accent"
              onClick={onDraw}
              disabled={entries.length === 0}
              aria-describedby={describedBy}
            >
              Sortear
            </PrimaryButton>
            {entries.length > 0 ? (
              <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
                <input
                  id="weighted-auto-remove"
                  type="checkbox"
                  checked={autoRemove}
                  onChange={(event) => setAutoRemove(event.currentTarget.checked)}
                  className="h-5 w-5 rounded-md border-control bg-surface text-action focus-visible:outline focus-visible:outline-focus"
                />
                Auto-eliminar ganadores
              </label>
            ) : null}
            <PrimaryButton
              id="weighted-reset-btn"
              variant="ghost"
              onClick={onReset}
              disabled={originalEntries.length === 0}
            >
              Reiniciar
            </PrimaryButton>
            <PrimaryButton
              id="weighted-clear-btn"
              variant="ghost"
              onClick={onClear}
            >
              Restablecer
            </PrimaryButton>
          </div>
          {entries.length === 0 ? (
            <p id="weighted-draw-hint" className="text-sm text-muted">
              Agregá al menos un participante para poder sortear.
            </p>
          ) : null}
        </div>

        {error ? (
          <p id="weighted-error" className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <section
            id="weighted-result"
            aria-labelledby="weighted-result-heading"
            className="panel min-w-0 break-words rounded-2xl bg-surface p-4 text-center shadow-pressed"
          >
            <h2
              id="weighted-result-heading"
              tabIndex={-1}
              className="font-sans text-sm font-semibold text-muted"
            >
              Ganador
            </h2>
            <p
              id="weighted-winner"
              className="break-words text-2xl font-bold text-action"
            >
              {result.winner.name}
            </p>
            <p id="weighted-probability" className="mt-1 text-sm text-muted">
              Probabilidad: <span className="font-mono">{result.probability}%</span>
            </p>
            <output
              id="weighted-result-announcement"
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
            >
              {`Ganador: ${result.winner.name}. Probabilidad: ${result.probability}%.`}
            </output>
          </section>
        ) : null}
      </section>

      <HistoryAside />
    </main>
  );
}
