// =============================================================================
// HistoryAside
//
// Panel lateral con las últimas operaciones del usuario (autor o
// anónimo). Equivale al antiguo `<aside id="history-aside">` y respeta el
// toggle móvil (`#history-toggle-btn`) usando estado interno.
// =============================================================================

import { useState } from 'react';

import { useHistoryStore } from '../store/historyStore';
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
  const clear = useHistoryStore((s) => s.clear);
  const [openMobile, setOpenMobile] = useState(false);

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
              onClick={clear}
              className="text-xs text-light-muted hover:text-danger transition-colors"
            >
              Limpiar
            </button>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-light-muted italic">Sin operaciones registradas.</p>
        ) : (
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
                  <span className="text-light-muted">{formatTime(entry.timestamp)}</span>
                </div>
                <span className="text-sm text-light-text truncate" title={entry.description}>
                  {entry.description}
                </span>
                {!entry.synced ? (
                  <span className="text-[10px] text-light-muted italic">solo local</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}