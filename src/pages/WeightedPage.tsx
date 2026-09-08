// =============================================================================
// WeightedPage (/weighted)
//
// Sorteo con pesos proporcionales. Permite:
// - Agregar entradas (nombre + peso).
// - Sortear; opcionalmente auto-elimina ganadores.
// - Reset restaura la lista original.
// =============================================================================

import { useState, type FormEvent } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
import { weightedStrategy } from '../strategies/WeightedStrategy';
import { useHistoryStore } from '../store/historyStore';
import type { WeightedEntry, WeightedResultLocal } from '../domain/contracts';

export function WeightedPage() {
  const [entries, setEntries] = useState<WeightedEntry[]>([]);
  const [originalEntries, setOriginalEntries] = useState<WeightedEntry[]>([]);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(1);
  const [autoRemove, setAutoRemove] = useState(false);
  const [result, setResult] = useState<WeightedResultLocal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addHistory = useHistoryStore((s) => s.add);

  const totalWeight = entries.reduce((acc, e) => acc + e.weight, 0);

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || weight < 1) return;
    setEntries((prev) => [...prev, { name: trimmed, weight }]);
    setOriginalEntries((prev) => [...prev, { name: trimmed, weight }]);
    setName('');
    setWeight(1);
  };

  const onDraw = () => {
    setError(null);
    setResult(null);
    if (entries.length === 0) {
      setError('Agrega al menos un participante antes de sortear.');
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
    setResult(null);
    setError(null);
  };

  return (
    <main
      className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-6 w-full mx-auto"
      role="main"
    >
      <section
        id="section-weighted"
        aria-label="Sorteo con pesos"
        className="min-w-0 animate-fade-in max-w-3xl mx-auto flex flex-col gap-4"
      >
        <h1 className="text-3xl font-bold">Sorteo con Pesos</h1>

        <form
          id="weighted-form"
          onSubmit={onAdd}
          className="bg-dark-surface border border-dark-border rounded-2xl p-4 grid grid-cols-[1fr_auto_auto] gap-3 items-end"
        >
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
            value={weight}
            onChange={(e) =>
              setWeight(Math.max(1, Math.min(100, Number(e.currentTarget.value))))
            }
          />
          <PrimaryButton type="submit" variant="primary">
            + Agregar
          </PrimaryButton>
        </form>

        <ul
          id="weighted-list"
          className="flex flex-col gap-2"
          aria-label="Participantes cargados"
        >
          {entries.length === 0 ? (
            <li className="text-sm text-light-muted italic">Sin participantes cargados.</li>
          ) : null}
          {entries.map((entry, i) => {
            const barWidth = totalWeight > 0 ? (entry.weight / totalWeight) * 100 : 0;
            return (
              <li
                key={`${entry.name}-${i}`}
                className="bg-dark-surface border border-dark-border rounded-md p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-light-text">{entry.name}</span>
                  <span className="text-light-muted">peso {entry.weight}</span>
                </div>
                <output
                  className="block h-2 rounded bg-primary/20"
                  style={{ width: `${barWidth}%` }}
                  aria-hidden="true"
                />
              </li>
            );
          })}
        </ul>

        <label className="inline-flex items-center gap-2 text-sm text-light-text">
          <input
            id="weighted-auto-remove"
            type="checkbox"
            checked={autoRemove}
            onChange={(e) => setAutoRemove(e.currentTarget.checked)}
            className="w-4 h-4 rounded border-dark-border bg-dark-surface text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
          />
          Auto-eliminar ganadores
        </label>

        <div className="flex gap-2">
          <PrimaryButton
            id="weighted-draw-btn"
            variant="accent"
            onClick={onDraw}
            disabled={entries.length === 0}
          >
            Sortear
          </PrimaryButton>
          <PrimaryButton
            id="weighted-reset-btn"
            variant="ghost"
            onClick={onReset}
            disabled={originalEntries.length === 0}
          >
            Reiniciar
          </PrimaryButton>
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <output
            id="weighted-result"
            className="bg-dark-surface border border-dark-border rounded-md p-4 text-center"
          >
            <div className="text-sm text-light-muted">Ganador</div>
            <div className="text-2xl font-bold text-primary-light">{result.winner.name}</div>
            <div className="text-sm text-light-muted mt-1">
              Probabilidad: {result.probability}%
            </div>
          </output>
        ) : null}
      </section>

      <HistoryAside />
    </main>
  );
}