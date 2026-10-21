// =============================================================================
// RootLayout
//
// Estructura común a todas las páginas: Header + grid principal + outlet de
// React Router. La página decide si renderiza el HistoryAside dentro del
// slot derecho del grid (la home lo omite).
//
// Además pide el disclaimer al backend una vez al montar y lo muestra en el
// pie. Si la petición falla no renderiza el pie: la app nunca se bloquea por
// un texto legal.
//
// También consulta `/api/health` al arrancar. Si el backend no responde,
// muestra un aviso discreto con botón "Reintentar" — se puede sortear igual,
// solo que el historial no se guarda.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Header } from './Header';
import { PrimaryButton } from './PrimaryButton';
import { legalRepository } from '../repositories/legalRepository';
import { healthRepository } from '../repositories/healthRepository';
import { retryPendingDraws, useHistoryStore } from '../store/historyStore';
import type { LegalDisclaimer } from '../domain/types';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Thrive Randomizer',
  '/dice': 'Dados RPG · Thrive Randomizer',
  '/numbers': 'Números aleatorios · Thrive Randomizer',
  '/teams': 'Generador de Equipos · Thrive Randomizer',
  '/weighted': 'Sorteo con Pesos · Thrive Randomizer',
  '/roulette': 'Ruleta de Decisiones · Thrive Randomizer',
  '/login': 'Iniciar sesión · Thrive Randomizer',
  '/register': 'Registro · Thrive Randomizer',
};

export function RootLayout() {
  const location = useLocation();
  // Normaliza mayúsculas y barra final: `/DICE` y `/dice/` son la misma
  // pantalla para React Router y deben compartir título.
  const normalizedPath =
    location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const lastPathRef = useRef(normalizedPath);

  useEffect(() => {
    document.title =
      ROUTE_TITLES[normalizedPath] ??
      'Página no encontrada · Thrive Randomizer';

    // En el primer render (y en la doble ejecución de StrictMode) no robamos
    // el foco: el enlace de salto debe ser el primero con Tab. Solo enfocamos
    // el h1 cuando la ruta normalizada cambió de verdad.
    const previousPath = lastPathRef.current;
    lastPathRef.current = normalizedPath;
    if (previousPath === normalizedPath) {
      return;
    }
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [normalizedPath]);

  // `null` = todavía no llegó (o falló). No se renderiza nada hasta entonces.
  const [disclaimer, setDisclaimer] = useState<LegalDisclaimer | null>(null);
  // `false` = backend disponible (o aún sin respuesta). `true` = caído.
  const [apiDown, setApiDown] = useState(false);
  const [checking, setChecking] = useState(false);
  // Distingue una recuperación (estaba caído) de un check exitoso inicial:
  // solo la recuperación dispara el reintento de pendientes.
  const wasDown = useRef(false);

  const guestImportPending = useHistoryStore((s) => s.guestImportPending);
  const guestEntries = useHistoryStore((s) => s.guestEntries);
  const guestImportError = useHistoryStore((s) => s.guestImportError);
  const importGuestHistory = useHistoryStore((s) => s.importGuestHistory);
  const dismissGuestImport = useHistoryStore((s) => s.dismissGuestImport);
  const guestDialogRef = useRef<HTMLDialogElement>(null);
  const [importingGuest, setImportingGuest] = useState(false);

  const checkHealth = useCallback(() => {
    setChecking(true);
    healthRepository
      .check()
      .then(() => {
        const recovered = wasDown.current;
        wasDown.current = false;
        setApiDown(false);
        if (recovered) {
          // El backend volvió a responder: se reintentan los sorteos que
          // quedaron sin guardar. El store ignora el intento sin sesión.
          void retryPendingDraws();
        }
      })
      .catch(() => {
        wasDown.current = true;
        setApiDown(true);
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    legalRepository
      .getDisclaimer()
      .then((data) => {
        if (!cancelled) setDisclaimer(data);
      })
      .catch(() => {
        // Sin disclaimer no hay pie: la app sigue funcionando igual.
        if (!cancelled) setDisclaimer(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    const dialog = guestDialogRef.current;
    if (!dialog) {
      return;
    }
    if (guestImportPending && !dialog.open) {
      dialog.showModal();
    } else if (!guestImportPending && dialog.open) {
      dialog.close();
    }
  }, [guestImportPending]);

  const onImportGuest = async () => {
    setImportingGuest(true);
    try {
      await importGuestHistory();
    } catch {
      // El store deja el mensaje en `guestImportError`; el diálogo sigue
      // abierto para que el usuario pueda reintentar o elegir "Ahora no".
    } finally {
      setImportingGuest(false);
    }
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-action focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-action focus:shadow-high focus:outline focus:outline-focus"
      >
        Saltar al contenido
      </a>

      <div className="min-h-dvh grid grid-rows-[3.5rem_1fr] bg-canvas text-ink font-sans antialiased">
        <Header />
        <div className="flex flex-col">
          {apiDown ? (
            <ApiDownBanner checking={checking} onRetry={checkHealth} />
          ) : null}
          <div id="main-content" tabIndex={-1} className="flex-1">
            <Outlet />
          </div>
          {disclaimer ? <DisclaimerFooter disclaimer={disclaimer} /> : null}
        </div>

      <dialog
        id="guest-import-dialog"
        ref={guestDialogRef}
        aria-labelledby="guest-import-title"
        className="rounded-2xl bg-surface border border-control text-ink p-6 max-w-md shadow-high backdrop:bg-scrim"
        onCancel={(event) => {
          event.preventDefault();
          if (!importingGuest) {
            dismissGuestImport();
          }
        }}
      >
        <h2 id="guest-import-title" className="text-xl font-bold mb-2">
          Importar historial de invitado
        </h2>
        <p className="text-sm text-muted mb-4">
          Tenés {guestEntries.length}{' '}
          {guestEntries.length === 1 ? 'sorteo guardado' : 'sorteos guardados'} en
          este navegador. ¿Querés pasarlos a tu cuenta?
        </p>
        {guestImportError ? (
          <p role="alert" className="text-sm text-danger mb-4">
            {guestImportError}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <PrimaryButton
            type="button"
            variant="ghost"
            onClick={dismissGuestImport}
            disabled={importingGuest}
          >
            Ahora no
          </PrimaryButton>
          <PrimaryButton
            type="button"
            variant="primary"
            onClick={() => void onImportGuest()}
            disabled={importingGuest}
          >
            {importingGuest ? 'Importando…' : 'Importar a mi cuenta'}
          </PrimaryButton>
        </div>
        </dialog>
      </div>
    </>
  );
}

/**
 * Aviso de backend caído.
 *
 * `role="status"` (no `alert`) porque no es un error de la acción del
 * usuario: es informativo y no debe interrumper un lector de pantalla.
 */
function ApiDownBanner({
  checking,
  onRetry,
}: {
  checking: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      id="api-down-banner"
      role="status"
      className="flex items-center justify-center gap-3 px-4 py-2 bg-surface border-b border-control text-sm text-muted"
    >
      <span>No se pudo conectar con el servidor. Los sorteos no se guardarán.</span>
      <button
        id="api-retry-btn"
        type="button"
        onClick={onRetry}
        disabled={checking}
        className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-semibold text-action hover:text-action-hover transition-colors focus-visible:outline focus-visible:outline-focus disabled:bg-surface-sunken disabled:text-muted disabled:cursor-not-allowed"
      >
        {checking ? 'Reintentando…' : 'Reintentar'}
      </button>
    </div>
  );
}

/** Pie con el disclaimer. Solo se monta cuando hay contenido. */
function DisclaimerFooter({ disclaimer }: { disclaimer: LegalDisclaimer }) {
  return (
    <footer
      id="legal-disclaimer"
      role="contentinfo"
      aria-label="Aviso legal"
      className="border-t border-control bg-surface px-6 py-6 text-sm text-muted"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        <h2 className="text-sm font-bold text-ink">
          {disclaimer.title}{' '}
          <span className="text-xs font-normal text-muted">
            v{disclaimer.version}
          </span>
        </h2>
        {/* Las secciones son largas: van en un `<details>` cerrado para no
            empujar el contenido de la app al abrir la página. */}
        <details className="text-xs">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink focus-visible:outline focus-visible:outline-focus">
            Ver el aviso completo ({disclaimer.sections.length} secciones)
          </summary>
          <dl className="mt-3 flex flex-col gap-3">
            {disclaimer.sections.map((section) => (
              <div key={section.heading}>
                <dt className="font-semibold text-ink">{section.heading}</dt>
                <dd className="leading-relaxed">{section.body}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </footer>
  );
}
