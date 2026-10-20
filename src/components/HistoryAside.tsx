// =============================================================================
// HistoryAside
//
// Panel lateral con las últimas operaciones del usuario (autor o anónimo).
// Colapsado por defecto; el estado se recuerda en `storage.ts`. Los
// resultados se formatean por módulo y las fechas se agrupan por día.
//
// La variante `mobile` queda preparada para la Fase 5: el panel se muestra
// como hoja inferior y conserva el mismo contenido.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';

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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Props {
  /** Si true, ocupa toda la columna; si false, columna fija 280px. */
  variant?: 'sidebar' | 'mobile';
}

export function HistoryAside({ variant = 'sidebar' }: Props) {
  const entries = useHistoryStore((s) => s.entries);
  const currentPage = useHistoryStore((s) => s.currentPage);
  const lastPage = useHistoryStore((s) => s.lastPage);
  const loading = useHistoryStore((s) => s.loading);
  const error = useHistoryStore((s) => s.error);
  const loadMore = useHistoryStore((s) => s.loadMore);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);
  const [openMobile, setOpenMobile] = useState(false);
  const [open, setOpen] = useState(() => loadHistoryOpen() ?? false);

  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    saveHistoryOpen(open);
  }, [open]);

  const groups = useMemo(() => formatHistoryGroups(entries), [entries]);

  // "Cargar más" solo tiene sentido con sesión (el invitado solo tiene
  // su mirror local, sin paginación de servidor) y si quedan páginas.
  const canLoadMore = isAuthenticated && currentPage < lastPage;

  /**
   * "Limpiar" con sesión borra los registros en el backend, que no se
   * pueden recuperar: por eso pide confirmación. Sin sesión solo vacía
   * memoria, así que no molesta preguntar.
   */
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

  const isMobile = variant === 'mobile';
  // En modo `mobile` el panel es un bottom sheet flotante — solo se muestra
  // si `openMobile` es true.
  const visibilityClass = isMobile
    ? openMobile
      ? '!block !fixed !bottom-0 !left-0 !right-0 !max-h-[60vh] z-40'
      : 'hidden'
    : '';

  return (
    <>
      {isMobile ? (
        <button
          id="history-toggle-btn"
          type="button"
          onClick={() => setOpenMobile((v) => !v)}
          aria-pressed={openMobile}
          aria-controls="history-aside"
          className="lg:hidden fixed bottom-4 right-4 z-50 px-4 py-2 rounded-full bg-primary text-light-inverse text-sm font-semibold shadow-lg hover:bg-primary-dark"
        >
          {openMobile ? 'Cerrar' : 'Historial'}
        </button>
      ) : null}

      <aside
        id="history-aside"
        aria-label="Historial de operaciones"
        className={`bg-dark-bg-alt border border-dark-border rounded-2xl p-4 flex flex-col gap-3 ${visibilityClass}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-light-text">Historial</h2>
          <div className="flex items-center gap-2">
            {open && entries.length > 0 ? (
              <button
                id="clear-history-btn"
                type="button"
                onClick={onClear}
                className="text-xs text-light-muted hover:text-danger transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
              >
                Limpiar
              </button>
            ) : null}
            <button
              id="history-collapse-btn"
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="history-panel"
              className="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-md px-2 text-xs font-semibold text-light-muted transition-colors hover:text-light-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
            >
              <ChevronIcon open={open} />
              <span>{open ? 'Ocultar historial' : 'Mostrar historial'}</span>
            </button>
          </div>
        </div>

        {error ? (
          <p id="history-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}

        <div id="history-panel" className="flex flex-col gap-3">
          {open && entries.length === 0 ? (
            <p className="text-sm text-light-muted italic">
              Sin operaciones registradas.
            </p>
          ) : open ? (
            <div id="history-list" className="flex flex-col gap-3 overflow-y-auto">
              {groups.map((group) => (
                <section
                  key={group.dateKey}
                  aria-labelledby={`history-day-${group.dateKey}`}
                >
                  <h3
                    id={`history-day-${group.dateKey}`}
                    className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-light-muted"
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
                          className="flex flex-col gap-1 px-3 py-2 rounded-md bg-dark-surface border border-dark-border"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-primary-light">
                              {MODULE_LABELS[entry.module]}
                            </span>
                            <span className="flex items-center gap-1">
                              <time
                                dateTime={safeDateTime(entry.timestamp)}
                                className="text-xs text-light-muted"
                              >
                                {formatHistoryTime(entry.timestamp)}
                              </time>
                              <button
                                type="button"
                                onClick={() => void remove(entry.id)}
                                aria-label={`Borrar ${entry.description}`}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-light-muted transition-colors hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
                              >
                                <span aria-hidden="true">✕</span>
                              </button>
                            </span>
                          </div>

                          <span
                            className="text-sm text-light-text"
                            title={entry.description}
                          >
                            {result.summary}
                          </span>

                          {result.teams ? (
                            <details className="text-xs text-light-muted">
                              <summary className="flex min-h-11 cursor-pointer select-none items-center">
                                Ver integrantes
                              </summary>
                              <ul className="mt-1 flex flex-col gap-1">
                                {result.teams.map((team) => (
                                  <li key={team.name}>
                                    <span className="font-semibold text-light-text">
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
                            <span className="text-[10px] text-danger italic">
                              sin guardar
                            </span>
                          ) : !entry.synced ? (
                            <span className="text-[10px] text-light-muted italic">
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
          ) : null}

          {open && canLoadMore ? (
            <button
              id="history-load-more-btn"
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              className="self-center text-xs text-primary-light hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando…' : 'Cargar más'}
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
