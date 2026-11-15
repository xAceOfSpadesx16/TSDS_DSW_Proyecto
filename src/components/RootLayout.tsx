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

import { AdSlot } from './AdSlot';
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
  // Login, registro y 404 no llevan publicidad; el resto de las rutas sí.
  const showAds =
    ROUTE_TITLES[normalizedPath] !== undefined &&
    normalizedPath !== '/login' &&
    normalizedPath !== '/register';

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
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-action focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-action focus:shadow-high focus:outline focus:outline-focus"
      >
        Saltar al contenido
      </a>

      <div className="min-h-dvh grid grid-rows-[3.5rem_1fr] bg-canvas text-ink font-sans antialiased">
        <Header />
        <div className="flex flex-col">
          {apiDown ? (
            <ApiDownBanner checking={checking} onRetry={checkHealth} />
          ) : null}
          <div className="flex w-full items-start justify-center">
            {showAds ? <AdRail side="left" /> : null}
            <div id="main-content" tabIndex={-1} className="min-w-0 flex-1">
              <Outlet />
            </div>
            {showAds ? <AdRail side="right" /> : null}
          </div>
          {showAds ? <AdBanner /> : null}
          {disclaimer ? <DisclaimerFooter disclaimer={disclaimer} /> : null}
        </div>

      <dialog
        id="guest-import-dialog"
        ref={guestDialogRef}
        aria-labelledby="guest-import-title"
        className="panel rounded-2xl bg-surface text-ink p-6 max-w-md shadow-high backdrop:bg-scrim"
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
 * Columna publicitaria fija a un costado del área de trabajo.
 *
 * Debajo de 1440 px no ocupa lugar; entre 1440 y 1535 muestra el formato de
 * 120×600 y desde 1536 el de 160×600. El `sticky` la mantiene a la vista
 * mientras se recorre la página.
 */
function AdRail({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      data-ad-rail={side}
      className={`sticky top-[4.5rem] mt-4 hidden shrink-0 self-start min-[1440px]:flex ${
        side === 'left' ? 'pl-4' : 'pr-4'
      }`}
    >
      <AdSlot variant="tower" className="min-[1536px]:hidden" />
      <AdSlot variant="tower-wide" className="hidden min-[1536px]:flex" />
    </div>
  );
}

/**
 * Banner publicitario de cierre, visible solo cuando no hay laterales.
 *
 * Usa 728×90 desde 820 px y 320×100 en pantallas más angostas. Queda en el
 * flujo, entre el contenido principal y el pie. Si el banner entra en la
 * franja del botón flotante de historial, publica un desplazamiento para que
 * el botón se aparte y no lo tape.
 */
function AdBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner) {
      return;
    }
    const root = document.documentElement;
    let frame = 0;

    const update = () => {
      frame = 0;
      const button = document.getElementById('history-toggle-btn');
      const wide = window.matchMedia?.('(min-width: 1440px)').matches ?? false;
      if (!button || wide) {
        root.style.setProperty('--ad-banner-offset', '0px');
        return;
      }

      const bannerRect = banner.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const buttonZoneTop = window.innerHeight - 76;
      const horizontalOverlap =
        bannerRect.left < buttonRect.right && buttonRect.left < bannerRect.right;

      if (
        !horizontalOverlap ||
        bannerRect.top >= window.innerHeight ||
        bannerRect.bottom <= buttonZoneTop
      ) {
        root.style.setProperty('--ad-banner-offset', '0px');
        return;
      }

      const offset = Math.max(0, window.innerHeight - bannerRect.top + 8);
      root.style.setProperty('--ad-banner-offset', `${Math.round(offset)}px`);
    };

    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule);
    observer?.observe(banner);
    observer?.observe(document.body);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      root.style.removeProperty('--ad-banner-offset');
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className="flex w-full justify-center px-0 py-6 min-[360px]:px-4 min-[1440px]:hidden"
    >
      <AdSlot variant="mobile-banner" className="min-[820px]:hidden" />
      <AdSlot variant="leaderboard" className="hidden min-[820px]:flex" />
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
      className="panel flex items-center justify-center gap-3 px-4 py-2 bg-surface shadow-low text-sm text-muted"
    >
      <span>No se pudo conectar con el servidor. Los sorteos no se guardarán.</span>
      <button
        id="api-retry-btn"
        type="button"
        onClick={onRetry}
        disabled={checking}
        className="inline-flex min-h-11 items-center rounded-full border border-control bg-surface px-3 text-xs font-semibold text-action shadow-low transition-colors hover:bg-surface-hover hover:text-action-hover active:shadow-pressed focus-visible:outline focus-visible:outline-focus disabled:bg-surface-sunken disabled:text-muted disabled:shadow-none disabled:cursor-not-allowed"
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
      className="panel bg-surface shadow-low px-6 py-6 text-sm text-muted"
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
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-control bg-surface px-3 font-semibold text-ink shadow-low focus-visible:outline focus-visible:outline-focus">
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
