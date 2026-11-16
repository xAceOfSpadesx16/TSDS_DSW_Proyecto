/** Estructura común: header, contenido, publicidad y pie. */

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

/** Layout raíz de la aplicación. */
export function RootLayout() {
  const location = useLocation();
  const normalizedPath =
    location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const lastPathRef = useRef(normalizedPath);
  const showAds =
    ROUTE_TITLES[normalizedPath] !== undefined &&
    normalizedPath !== '/login' &&
    normalizedPath !== '/register';

  useEffect(() => {
    document.title =
      ROUTE_TITLES[normalizedPath] ??
      'Página no encontrada · Thrive Randomizer';

    const previousPath = lastPathRef.current;
    lastPathRef.current = normalizedPath;
    if (previousPath === normalizedPath) {
      return;
    }
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [normalizedPath]);

  const [disclaimer, setDisclaimer] = useState<LegalDisclaimer | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const [checking, setChecking] = useState(false);
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
      // El mensaje queda en `guestImportError` y el diálogo sigue abierto.
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
          <div className="flex w-full flex-1 items-start justify-center">
            {showAds ? <AdRail side="left" /> : null}
            <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 self-stretch">
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

/** Columna publicitaria sticky a un costado del área de trabajo. */
function AdRail({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      data-ad-rail={side}
      className="sticky top-[4.5rem] mt-4 hidden shrink-0 self-start px-4 min-[1440px]:flex"
    >
      <AdSlot variant="tower" className="min-[1536px]:hidden" />
      <AdSlot
        variant="tower-wide"
        className="hidden min-[1536px]:flex min-[2104px]:hidden"
      />
      <AdSlot variant="tower-large" className="hidden min-[2104px]:flex" />
    </div>
  );
}

/** Banner de cierre, visible cuando no hay laterales. */
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

/** Aviso informativo de backend caído. */
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
      <span>
        No se pudo conectar con el servidor. Podés seguir sorteando: tus sorteos
        se guardan en este navegador y se sincronizarán cuando vuelva la
        conexión.
      </span>
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
      className="panel mt-auto bg-surface shadow-low px-4 py-6 text-sm text-muted sm:px-6"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        <h2 className="text-sm font-bold text-ink">
          {disclaimer.title}{' '}
          <span className="text-xs font-normal text-muted">
            v{disclaimer.version}
          </span>
        </h2>
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
