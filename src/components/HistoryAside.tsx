/** Panel de historial superpuesto y su botón de apertura. */

import { useEffect, useMemo, useRef, useState } from 'react';

import { useHistoryStore } from '../store/historyStore';
import { useAuthStore, selectIsAuthenticated } from '../store/authStore';
import {
  formatHistoryGroups,
  formatHistoryResult,
  formatHistoryTime,
} from '../lib/historyFormat';
import { loadHistoryOpen, saveHistoryOpen } from '../lib/storage';
import type { ModuleName } from '../domain/types';

const MODULE_LABELS: Record<ModuleName, string> = {
  dice: 'Dados',
  numbers: 'Números',
  roulette: 'Ruleta',
  teams: 'Equipos',
  weighted: 'Sorteo',
};

function safeDateTime(iso: string): string | undefined {
  return Number.isNaN(new Date(iso).getTime()) ? undefined : iso;
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Lista los sorteos agrupados por día en un panel no modal. */
export function HistoryAside() {
  const entries = useHistoryStore((s) => s.entries);
  const currentPage = useHistoryStore((s) => s.currentPage);
  const lastPage = useHistoryStore((s) => s.lastPage);
  const loading = useHistoryStore((s) => s.loading);
  const error = useHistoryStore((s) => s.error);
  const loadMore = useHistoryStore((s) => s.loadMore);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);
  const [open, setOpen] = useState(() => loadHistoryOpen() ?? false);

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousOpenRef = useRef(open);
  const mountedRef = useRef(false);

  useEffect(() => {
    saveHistoryOpen(open);
  }, [open]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      previousOpenRef.current = open;
      return;
    }
    if (open && !previousOpenRef.current) {
      titleRef.current?.focus();
    } else if (!open && previousOpenRef.current) {
      toggleRef.current?.focus();
    }
    previousOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const groups = useMemo(() => formatHistoryGroups(entries), [entries]);
  const canLoadMore = isAuthenticated && currentPage < lastPage;

  const onClear = () => {
    if (
      isAuthenticated &&
      !window.confirm(
        '¿Borrar todo tu historial? Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }
    void clear();
  };

  return (
    <>
      <button
        id="history-toggle-btn"
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="history-aside"
        aria-label="Historial"
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-control bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-high transition-[background-color,color,box-shadow] hover:bg-surface-hover hover:text-action active:shadow-pressed focus-visible:outline focus-visible:outline-focus lg:static lg:shadow-low ${
          open ? 'hidden' : 'fixed bottom-4 right-4 z-50 lg:z-auto'
        }`}
      >
        <ClockIcon />
        <span>Historial</span>
        {entries.length > 0 ? (
          <span
            aria-hidden="true"
            className="inline-flex min-w-5 items-center justify-center rounded-full bg-surface-sunken px-1.5 font-mono text-xs text-action"
          >
            {entries.length}
          </span>
        ) : null}
      </button>

      {open ? (
      <aside
        id="history-aside"
        aria-labelledby="history-panel-title"
        className="panel fixed bottom-0 left-0 right-0 z-40 flex max-h-[70dvh] flex-col gap-3 overflow-hidden rounded-t-2xl bg-surface p-4 shadow-high lg:bottom-0 lg:left-auto lg:right-0 lg:top-14 lg:max-h-none lg:w-[clamp(320px,22vw,380px)] lg:rounded-l-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            id="history-panel-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-base font-bold text-ink"
          >
            Historial
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {entries.length > 0 ? (
              <button
                id="clear-history-btn"
                type="button"
                onClick={onClear}
                className="inline-flex min-h-11 min-w-11 items-center rounded-full border border-control bg-surface px-3 text-xs text-muted shadow-low transition-colors hover:bg-surface-hover hover:text-danger active:shadow-pressed focus-visible:outline focus-visible:outline-focus"
              >
                Limpiar
              </button>
            ) : null}
            <button
              id="history-close-btn"
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center rounded-full border border-control bg-surface px-3 text-xs font-semibold text-ink shadow-low transition-colors hover:bg-surface-hover active:shadow-pressed focus-visible:outline focus-visible:outline-focus"
            >
              Cerrar
            </button>
          </div>
        </div>

        {error ? (
          <p id="history-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}

        <div
          id="history-panel"
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
          {entries.length === 0 ? (
            <p className="text-sm text-muted italic">
              Sin operaciones registradas.
            </p>
          ) : (
            <div
              id="history-list"
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
            >
              {groups.map((group) => (
                <section
                  key={group.dateKey}
                  aria-labelledby={`history-day-${group.dateKey}`}
                >
                  <h3
                    id={`history-day-${group.dateKey}`}
                    className="mb-2 text-[13px] leading-[19px] font-semibold text-muted"
                  >
                    <time
                      dateTime={
                        group.dateKey === 'sin-fecha' ? undefined : group.dateKey
                      }
                    >
                      {group.label}
                    </time>
                  </h3>
                  <ol className="flex flex-col gap-2">
                    {group.entries.map((entry) => {
                      const result = formatHistoryResult(entry);
                      return (
                        <li
                          key={entry.id}
                          data-history-entry
                          className="panel flex min-w-0 flex-col gap-1 rounded-2xl bg-surface px-3 py-2 break-words shadow-low"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-ink">
                              {MODULE_LABELS[entry.module]}
                            </span>
                            <span className="flex items-center gap-1">
                              <time
                                dateTime={safeDateTime(entry.timestamp)}
                                className="text-xs text-muted"
                              >
                                {formatHistoryTime(entry.timestamp)}
                              </time>
                              <button
                                type="button"
                                onClick={() => void remove(entry.id)}
                                aria-label={`Borrar ${entry.description}`}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-control bg-surface text-muted shadow-low transition-colors hover:bg-surface-hover hover:text-danger active:shadow-pressed focus-visible:outline focus-visible:outline-focus"
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
                            </span>
                          </div>

                          <span
                            className="break-words text-sm text-ink"
                            title={entry.description}
                          >
                            {result.summary}
                          </span>

                          {result.teams ? (
                            <details className="text-xs text-muted">
                              <summary className="flex min-h-11 cursor-pointer select-none items-center rounded-full border border-control bg-surface px-2 shadow-low focus-visible:outline focus-visible:outline-focus">
                                Ver integrantes
                              </summary>
                              <ul className="mt-1 flex flex-col gap-1">
                                {result.teams.map((team) => (
                                  <li key={team.name} className="break-words">
                                    <span className="font-semibold text-ink">
                                      {team.name}:
                                    </span>{' '}
                                    {team.members.length > 0
                                      ? team.members.join(', ')
                                      : '(vacío)'}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : null}

                          {entry.pending ? (
                            <span className="text-[13px] leading-[19px] text-danger italic">
                              sin guardar
                            </span>
                          ) : !entry.synced ? (
                            <span className="text-[13px] leading-[19px] text-muted italic">
                              Guardado en este navegador
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}

          {canLoadMore ? (
            <div className="flex shrink-0 justify-center border-t border-control pt-3">
              <button
                id="history-load-more-btn"
                type="button"
                onClick={() => void loadMore()}
                disabled={loading}
                className="inline-flex min-h-11 items-center rounded-full border border-control bg-surface px-3 text-xs text-action shadow-low transition-colors hover:bg-surface-hover hover:text-action-hover active:shadow-pressed focus-visible:outline focus-visible:outline-focus disabled:bg-surface-sunken disabled:text-muted disabled:shadow-none disabled:cursor-not-allowed"
              >
                {loading ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          ) : null}
        </div>
      </aside>
      ) : null}
    </>
  );
}
