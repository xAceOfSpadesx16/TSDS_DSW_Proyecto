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
import { Outlet } from 'react-router-dom';

import { Header } from './Header';
import { PrimaryButton } from './PrimaryButton';
import { legalRepository } from '../repositories/legalRepository';
import { healthRepository } from '../repositories/healthRepository';
import { retryPendingDraws, useHistoryStore } from '../store/historyStore';
import type { LegalDisclaimer } from '../domain/types';

export function RootLayout() {
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
    <div className="min-h-screen grid grid-rows-[3.5rem_1fr] bg-dark-bg text-light-text font-sans antialiased">
      <Header />
      <div className="flex flex-col">
        {apiDown ? <ApiDownBanner checking={checking} onRetry={checkHealth} /> : null}
        <div className="flex-1">
          <Outlet />
        </div>
        {disclaimer ? <DisclaimerFooter disclaimer={disclaimer} /> : null}
      </div>

      <dialog
        id="guest-import-dialog"
        ref={guestDialogRef}
        aria-labelledby="guest-import-title"
        className="rounded-2xl bg-dark-surface border border-dark-border text-light-text p-6 max-w-md backdrop:bg-black/70"
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
        <p className="text-sm text-light-muted mb-4">
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
      className="flex items-center justify-center gap-3 px-4 py-2 bg-dark-bg-alt border-b border-dark-border text-sm text-light-muted"
    >
      <span>No se pudo conectar con el servidor. Los sorteos no se guardarán.</span>
      <button
        id="api-retry-btn"
        type="button"
        onClick={onRetry}
        disabled={checking}
        className="text-xs font-semibold text-primary-light hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {checking ? 'Reintentando...' : 'Reintentar'}
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
      className="border-t border-dark-border bg-dark-bg-alt px-6 py-6 text-sm text-light-muted"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        <h2 className="text-sm font-bold text-light-text">
          {disclaimer.title}{' '}
          <span className="text-xs font-normal text-light-muted">
            v{disclaimer.version}
          </span>
        </h2>
        {/* Las secciones son largas: van en un `<details>` cerrado para no
            empujar el contenido de la app al abrir la página. */}
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-light-text">
            Ver el aviso completo ({disclaimer.sections.length} secciones)
          </summary>
          <dl className="mt-3 flex flex-col gap-3">
            {disclaimer.sections.map((section) => (
              <div key={section.heading}>
                <dt className="font-semibold text-light-text">{section.heading}</dt>
                <dd className="leading-relaxed">{section.body}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </footer>
  );
}
