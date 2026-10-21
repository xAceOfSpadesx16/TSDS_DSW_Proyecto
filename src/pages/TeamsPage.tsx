// =============================================================================
// TeamsPage (/teams)
//
// Form con:
// - textarea para participantes (uno por línea).
// - toggle entre modo "cantidad de grupos" y "tamaño de grupo".
// - reglas avanzadas: pares de exclusión (no pueden quedar juntos).
// =============================================================================

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { HistoryAside } from '../components/HistoryAside';
import { prefersReducedMotion } from '../lib/motion';
import { clearTeamsOptions, loadTeamsOptions, saveTeamsOptions } from '../lib/storage';
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
  const [initialOptions] = useState(() => loadTeamsOptions());
  const [participantsText, setParticipantsText] = useState(
    initialOptions?.participantsText ?? '',
  );
  const [mode, setMode] = useState<TeamsMode>(initialOptions?.mode ?? 'count');
  const [value, setValue] = useState<NumericInput>(initialOptions?.value ?? 2);
  const [exclusionA, setExclusionA] = useState('');
  const [exclusionB, setExclusionB] = useState('');
  const [exclusions, setExclusions] = useState<Exclusion[]>(() => {
    if (!initialOptions) {
      return [];
    }
    const names = parseParticipants(initialOptions.participantsText);
    return initialOptions.exclusions.filter(
      ([a, b]) => names.includes(a) && names.includes(b),
    );
  });
  const [result, setResult] = useState<TeamsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addHistory = useHistoryStore((s) => s.add);

  useEffect(() => {
    saveTeamsOptions({
      participantsText,
      mode,
      value: clampValue(value, mode),
      exclusions,
    });
  }, [participantsText, mode, value, exclusions]);

  // Al generar, el resultado completo se acerca al viewport; el botón de
  // generar sigue visible porque el desplazamiento es el mínimo necesario.
  useEffect(() => {
    if (!result) return;
    const section = document.getElementById('team-results-section');
    if (!section || typeof section.scrollIntoView !== 'function') return;
    section.scrollIntoView({
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [result]);

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

  const onReset = () => {
    clearTeamsOptions();
    setParticipantsText('');
    setMode('count');
    setValue(2);
    setExclusions([]);
    setExclusionA('');
    setExclusionB('');
    setResult(null);
    setError(null);
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
      className="workspace workspace-grid"
    >
      <section
        id="section-teams"
        aria-label="Generador de equipos"
        className="w-full min-w-0 animate-fade-in flex flex-col gap-4"
      >
        <h1 tabIndex={-1} className="font-bold">
          Generador de Equipos
        </h1>

        <form
          id="team-form"
          onSubmit={onGenerate}
          aria-describedby={error ? 'teams-error' : undefined}
          className="bg-surface border border-control rounded-2xl shadow-raised p-3 flex flex-col gap-4 sm:p-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted font-medium">Participantes (uno por línea)</span>
            <textarea
              id="team-participants"
              required
              aria-required="true"
              rows={4}
              value={participantsText}
              onChange={(e) => onChangeParticipants(e.currentTarget.value)}
              placeholder={'Ana\nBruno\nCarla\nDiego'}
              className="w-full min-w-0 px-3 py-2 rounded-md bg-surface border border-control text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-focus"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Modo de reparto</legend>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
          </fieldset>

          <Field
            id="team-value"
            label={mode === 'count' ? 'Cantidad de grupos' : 'Tamaño de grupo'}
            type="number"
            min={valueMin(mode)}
            value={value}
            onChange={(e) => setValue(readNumeric(e.currentTarget.value))}
            onBlur={() => setValue(clampValue(value, mode))}
          />

          <details className="bg-surface border border-control rounded-lg p-3 shadow-low">
            <summary className="-my-2 flex min-h-11 cursor-pointer items-center text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-focus">
              Reglas avanzadas (exclusiones)
            </summary>
            <p id="teams-exclusion-hint" className="mt-2 text-xs text-muted">
              Elegí dos personas que no deban quedar en el mismo equipo.
            </p>
            {participantOptions.length < 2 ? (
              <p className="mt-3 text-xs text-muted">
                Cargá al menos dos participantes para elegir exclusiones.
              </p>
            ) : (
              <fieldset
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                aria-describedby="teams-exclusion-hint"
              >
                <legend className="sr-only">Agregar exclusión</legend>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted font-medium">Persona A</span>
                  <select
                    id="exclusion-a"
                    value={exclusionA}
                    onChange={(e) => setExclusionA(e.currentTarget.value)}
                    className="min-h-[44px] w-full min-w-0 px-3 py-2 rounded-md bg-surface border border-control text-ink focus-visible:outline focus-visible:outline-focus"
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
                  <span className="text-muted font-medium">Persona B</span>
                  <select
                    id="exclusion-b"
                    value={exclusionB}
                    onChange={(e) => setExclusionB(e.currentTarget.value)}
                    className="min-h-[44px] w-full min-w-0 px-3 py-2 rounded-md bg-surface border border-control text-ink focus-visible:outline focus-visible:outline-focus"
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
              </fieldset>
            )}
            <ul
              id="exclusion-list"
              className="mt-3 flex min-w-0 flex-wrap gap-2"
              aria-label="Pares de exclusión"
            >
              {exclusions.map(([a, b], i) => (
                <li
                  key={`${a}-${b}-${i}`}
                  className="inline-flex max-w-full min-w-0 items-center gap-2 rounded border border-control bg-surface px-2 py-1 text-sm shadow-low"
                >
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {a} ↔ {b}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveExclusion(i)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:text-danger focus-visible:outline focus-visible:outline-focus"
                    aria-label={`Quitar exclusión ${a} ${b}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </details>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton id="generate-teams-btn" type="submit" variant="primary">
              Generar Equipos
            </PrimaryButton>
            <PrimaryButton
              id="teams-reset-btn"
              type="button"
              variant="ghost"
              onClick={onReset}
            >
              Restablecer
            </PrimaryButton>
          </div>
        </form>

        {error ? (
          <p
            id="teams-error"
            className="break-words text-sm text-danger [overflow-wrap:anywhere]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <section
            id="team-results-section"
            aria-labelledby="team-results-heading"
            className="flex flex-col gap-3"
          >
            <h2 id="team-results-heading" className="sr-only">
              Resultados
            </h2>
            <output
              id="team-results-announcement"
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
            >
              {result.teams
                .map(
                  (team, index) =>
                    `Equipo ${index + 1}: ${
                      team.length === 0 ? 'vacío' : team.join(', ')
                    }.`,
                )
                .join(' ')}
            </output>
            <div
              id="team-results"
              className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3"
            >
              {result.teams.map((team, i) => (
                <div
                  key={i}
                  className="min-w-0 rounded-lg border border-control bg-surface p-4 shadow-low"
                >
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                    <span
                      data-team-color
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: result.colors[i] }}
                    />
                    Equipo {i + 1}
                  </h3>
                  <ul className="flex min-w-0 flex-col gap-1 text-sm text-ink">
                    {team.length === 0 ? (
                      <li className="text-muted italic">(vacío)</li>
                    ) : (
                      team.map((member, j) => (
                        <li key={j} className="break-words">
                          {member}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <HistoryAside />
    </main>
  );
}