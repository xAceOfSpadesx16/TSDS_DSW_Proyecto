// =============================================================================
// HistoryAside
//
// Panel lateral con las últimas operaciones del usuario (autor o
// anónimo). Equivale al antiguo `<aside id="history-aside">` y respeta el
// toggle móvil (`#history-toggle-btn`) usando estado interno.
// =============================================================================

import { useState } from 'react';

import { useHistoryStore } from '../store/historyStore';
import { useAuthStore, selectIsAuthenticated } from '../store/authStore';
import type { ModuleName } from '../domain/types';

const MODULE_LABELS: Record<ModuleName, string> = {
  dice: 'Dados',
  numbers: 'Números',
  roulette: 'Ruleta',
  teams: 'Equipos',
  weighted: 'Sorteo',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  });
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

  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  // "Cargar más" solo tiene sentido con sesión (el invitado solo tiene
  // su mirror local, sin paginación de servidor) y si quedan páginas.
  const canLoadMore = isAuthenticated && currentPage < lastPage;

  /**
   * "Limpiar" con sesión borra los registros en el backend, que no se
   * pueden recuperar: por eso pide confirmación. Sin sesión solo vacía
   * memoria, así que no molesta preguntar.
   */
  const onClear = () => {
    if (isAuthenticated && !window.confirm('¿Borrar todo tu historial? Esta acción no se puede deshacer.')) {
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
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-light-text">Historial</h2>
          {entries.length > 0 ? (
            <button
              id="clear-history-btn"
              type="button"
              onClick={onClear}
              className="text-xs text-light-muted hover:text-danger transition-colors"
            >
              Limpiar
            </button>
          ) : null}
        </div>

        {error ? (
          <p id="history-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}

        {entries.length === 0 ? (
          <p className="text-sm text-light-muted italic">Sin operaciones registradas.</p>
        ) : (
          <>
            <ul id="history-list" className="flex flex-col gap-2 overflow-y-auto">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-dark-surface border border-dark-border"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-primary-light">
                      {MODULE_LABELS[entry.module]}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-light-muted">{formatTime(entry.timestamp)}</span>
                      <button
                        type="button"
                        onClick={() => void remove(entry.id)}
                        aria-label={`Borrar ${entry.description}`}
                        className="text-light-muted hover:text-danger transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                  <span className="text-sm text-light-text truncate" title={entry.description}>
                    {entry.description}
                  </span>
                  {/* Distingue un sorteo de invitado (solo en memoria) de
                      uno que se intentó guardar y sigue pendiente. */}
                  {entry.pending ? (
                    <span className="text-[10px] text-danger italic">sin guardar</span>
                  ) : !entry.synced ? (
                    <span className="text-[10px] text-light-muted italic">Guardado en este navegador</span>
                  ) : null}
                </li>
              ))}
            </ul>

            {canLoadMore ? (
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
          </>
        )}
      </aside>
    </>
  );
}