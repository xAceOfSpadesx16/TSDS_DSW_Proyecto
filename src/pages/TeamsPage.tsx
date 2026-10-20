// =============================================================================
// TeamsPage (/teams)
//
// Form con:
// - textarea para participantes (uno por línea).
// - toggle entre modo "cantidad de grupos" y "tamaño de grupo".
// - reglas avanzadas: pares de exclusión (no pueden quedar juntos).
// =============================================================================

import { useMemo, useState, type FormEvent } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
import { teamsStrategy } from '../strategies/TeamsStrategy';
import { useHistoryStore } from '../store/historyStore';
import { clampMin, readNumeric, type NumericInput } from '../lib/numericInput';
import type { TeamsMode, TeamsResult } from '../domain/contracts';

type Exclusion = [string, string];

/** Mínimo del campo `value` según el modo. */
function valueMin(mode: TeamsMode): number {
  return mode === 'count' ? 2 : 1;
}

/** Aplica el mínimo del modo a un input numérico. */
function clampValue(value: NumericInput, mode: TeamsMode): number {
  return clampMin(value, valueMin(mode));
}

/** Participantes normalizados: una persona por línea, sin vacíos. */
function parseParticipants(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((participant) => participant.trim())
    .filter((participant) => participant.length > 0);
}

export function TeamsPage() {
  const [participantsText, setParticipantsText] = useState('');
  const [mode, setMode] = useState<TeamsMode>('count');
  const [value, setValue] = useState<NumericInput>(2);
  const [exclusionA, setExclusionA] = useState('');
  const [exclusionB, setExclusionB] = useState('');
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [result, setResult] = useState<TeamsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addHistory = useHistoryStore((s) => s.add);

  const participants = useMemo(() => parseParticipants(participantsText), [participantsText]);
  const participantOptions = useMemo(
    () => Array.from(new Set(participants)),
    [participants],
  );
  const canAddExclusion =
    exclusionA !== '' && exclusionB !== '' && exclusionA !== exclusionB;

  const onChangeMode = (next: TeamsMode) => {
    setMode(next);
    setValue(next === 'count' ? 2 : 3);
  };

  /**
   * Al cambiar la lista de participantes, las exclusiones que mencionan a
   * alguien que ya no está se descartan: una regla sobre una persona ausente
   * no se puede cumplir ni explicar.
   */
  const onChangeParticipants = (nextText: string) => {
    setParticipantsText(nextText);
    setError(null);
    const nextParticipants = parseParticipants(nextText);
    setExclusions((prev) =>
      prev.filter(
        ([a, b]) => nextParticipants.includes(a) && nextParticipants.includes(b),
      ),
    );
    setExclusionA((prev) => (nextParticipants.includes(prev) ? prev : ''));
    setExclusionB((prev) => (nextParticipants.includes(prev) ? prev : ''));
  };

  const onAddExclusion = () => {
    if (!canAddExclusion) return;
    setError(null);
    const a = exclusionA;
    const b = exclusionB;
    setExclusions((prev) => {
      const alreadyExists = prev.some(
        ([x, y]) => (x === a && y === b) || (x === b && y === a),
      );
      return alreadyExists ? prev : [...prev, [a, b]];
    });
    setExclusionA('');
    setExclusionB('');
  };

  const onRemoveExclusion = (idx: number) => {
    setError(null);
    setExclusions((prev) => prev.filter((_, i) => i !== idx));
  };

  const onGenerate = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    // El mínimo según el modo se aplica al enviar, no en cada tecla.
    const valueNum = clampValue(value, mode);
    setValue(valueNum);
    if (participants.length < 2) {
      setError('Ingresá al menos 2 participantes.');
      return;
    }
    try {
      const input = { participants, mode, value: valueNum, exclusions };
      const { local, backend } = teamsStrategy.execute(input);
      setResult(local);
      void addHistory({
        module: 'teams',
        description: `${participants.length} participantes → ${backend.teams.length} equipos`,
        record: {
          module_name: 'teams',
          action: teamsStrategy.actionLabel(input),
          payload: teamsStrategy.buildPayload(input),
          result: backend,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar.');
    }
  };

  return (
    <main
      className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-6 w-full mx-auto"
      role="main"
    >
      <section
        id="section-teams"
        aria-label="Generador de equipos"
        className="min-w-0 animate-fade-in max-w-3xl mx-auto flex flex-col gap-4"
      >
        <h1 className="text-3xl font-bold">Generador de Equipos</h1>

        <form
          id="team-form"
          onSubmit={onGenerate}
          className="bg-dark-surface border border-dark-border rounded-2xl p-4 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-light-muted font-medium">Participantes (uno por línea)</span>
            <textarea
              id="team-participants"
              required
              aria-required="true"
              rows={6}
              value={participantsText}
              onChange={(e) => onChangeParticipants(e.currentTarget.value)}
              placeholder={'Ana\nBruno\nCarla\nDiego'}
              className="px-3 py-2 rounded-md bg-dark-surface border border-dark-border text-light-text placeholder:text-light-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
            />
          </label>

          <div className="flex gap-2">
            <PrimaryButton
              id="mode-group-count"
              type="button"
              variant={mode === 'count' ? 'primary' : 'ghost'}
              aria-pressed={mode === 'count'}
              onClick={() => onChangeMode('count')}
            >
              Cantidad de grupos
            </PrimaryButton>
            <PrimaryButton
              id="mode-group-size"
              type="button"
              variant={mode === 'size' ? 'primary' : 'ghost'}
              aria-pressed={mode === 'size'}
              onClick={() => onChangeMode('size')}
            >
              Tamaño de grupo
            </PrimaryButton>
          </div>

          <Field
            id="team-value"
            label={mode === 'count' ? 'Cantidad de grupos' : 'Tamaño de grupo'}
            type="number"
            min={valueMin(mode)}
            value={value}
            onChange={(e) => setValue(readNumeric(e.currentTarget.value))}
            onBlur={() => setValue(clampValue(value, mode))}
          />

          <details className="bg-dark-bg-alt border border-dark-border rounded-md p-3">
            <summary className="text-sm font-semibold text-light-text cursor-pointer">
              Reglas avanzadas (exclusiones)
            </summary>
            {participantOptions.length < 2 ? (
              <p className="mt-3 text-xs text-light-muted">
                Cargá al menos dos participantes para elegir exclusiones.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-light-muted font-medium">Persona A</span>
                  <select
                    id="exclusion-a"
                    value={exclusionA}
                    onChange={(e) => setExclusionA(e.currentTarget.value)}
                    className="min-h-[44px] px-3 py-2 rounded-md bg-dark-surface border border-dark-border text-light-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
                  >
                    <option value="">Elegí una persona</option>
                    {participantOptions.map((participant) => (
                      <option key={participant} value={participant}>
                        {participant}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-light-muted font-medium">Persona B</span>
                  <select
                    id="exclusion-b"
                    value={exclusionB}
                    onChange={(e) => setExclusionB(e.currentTarget.value)}
                    className="min-h-[44px] px-3 py-2 rounded-md bg-dark-surface border border-dark-border text-light-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
                  >
                    <option value="">Elegí una persona</option>
                    {participantOptions.map((participant) => (
                      <option key={participant} value={participant}>
                        {participant}
                      </option>
                    ))}
                  </select>
                </label>
                <PrimaryButton
                  id="add-exclusion-btn"
                  type="button"
                  variant="ghost"
                  onClick={onAddExclusion}
                  disabled={!canAddExclusion}
                  className="min-h-[44px]"
                >
                  Agregar
                </PrimaryButton>
              </div>
            )}
            <ul
              id="exclusion-list"
              className="mt-3 flex flex-wrap gap-2"
              aria-label="Pares de exclusión"
            >
              {exclusions.map(([a, b], i) => (
                <li
                  key={`${a}-${b}-${i}`}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-dark-surface border border-dark-border text-sm"
                >
                  <span>
                    {a} ↔ {b}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveExclusion(i)}
                    className="text-light-muted hover:text-danger"
                    aria-label={`Quitar exclusión ${a} ${b}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </details>

          <PrimaryButton id="generate-teams-btn" type="submit" variant="primary">
            Generar Equipos
          </PrimaryButton>
        </form>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <output
            id="team-results"
            className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3"
          >
            {result.teams.map((team, i) => (
              <div
                key={i}
                className="bg-dark-surface border border-dark-border rounded-md p-4"
                style={{ borderLeft: `4px solid ${result.colors[i]}` }}
              >
                <h3 className="text-sm font-bold mb-2" style={{ color: result.colors[i] }}>
                  Equipo {i + 1}
                </h3>
                <ul className="flex flex-col gap-1 text-sm text-light-text">
                  {team.length === 0 ? (
                    <li className="text-light-muted italic">(vacío)</li>
                  ) : (
                    team.map((member, j) => <li key={j}>{member}</li>)
                  )}
                </ul>
              </div>
            ))}
          </output>
        ) : null}
      </section>

      <HistoryAside />
    </main>
  );
}