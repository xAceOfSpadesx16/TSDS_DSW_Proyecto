// =============================================================================
// Header
//
// Barra superior con marca, navegación responsive y acciones de auth.
// Debajo de `lg` la navegación se colapsa en un botón con `aria-expanded`;
// se cierra con Escape, al navegar o al elegir una opción. En pantallas
// chicas las acciones de auth se ofrecen dentro del mismo panel.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { NavLinkButton } from './NavLinkButton';
import { PrimaryButton } from './PrimaryButton';
import { useAuthStore, selectIsAuthenticated } from '../store/authStore';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const isAuthed = selectIsAuthenticated({ user, token } as never);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Al cambiar de ruta el panel móvil no debe quedar abierto.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Escape cierra el panel y devuelve el foco al botón que lo abrió.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Al abrir, el foco entra al primer enlace del panel.
  useEffect(() => {
    if (!open) {
      return;
    }
    const firstLink = navRef.current?.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header
      className="panel relative flex items-center justify-between gap-2 px-4 bg-surface shadow-low sticky top-0 z-50"
      role="banner"
    >
      <NavLink
        to="/"
        end
        className="inline-flex min-h-11 min-w-0 items-center gap-2 truncate font-display text-lg font-bold text-ink hover:text-action hover:no-underline"
      >
        Thrive Randomizer
      </NavLink>

      <nav
        id="app-nav"
        ref={navRef}
        className={`${
          open ? 'flex' : 'hidden'
        } lg:flex absolute lg:static left-0 right-0 top-full lg:top-auto z-50 lg:z-auto flex-col lg:flex-row lg:items-center gap-1 panel bg-surface lg:bg-transparent px-4 py-3 lg:p-0 shadow-high lg:shadow-none [&>a]:min-h-11 [&>a]:w-full [&>a]:items-center [&>a]:justify-start lg:[&>a]:w-auto`}
        aria-label="Navegación principal"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) {
            closeMenu();
          }
        }}
      >
        <NavLinkButton to="/">Inicio</NavLinkButton>
        <NavLinkButton to="/teams">Equipos</NavLinkButton>
        <NavLinkButton to="/weighted">Sorteo</NavLinkButton>
        <NavLinkButton to="/roulette">Ruleta</NavLinkButton>
        <NavLinkButton to="/dice">Dados</NavLinkButton>
        <NavLinkButton to="/numbers">Números</NavLinkButton>

        {open ? (
          <div className="panel md:hidden mt-2 flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-low">
            {isAuthed ? (
              <>
                <span className="break-words text-sm text-muted">
                  {user?.name}
                </span>
                <PrimaryButton
                  variant="ghost"
                  className="min-h-11 w-full !justify-start"
                  onClick={() => {
                    closeMenu();
                    void logout();
                  }}
                >
                  Salir
                </PrimaryButton>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink hover:no-underline focus-visible:outline focus-visible:outline-focus"
                >
                  Entrar
                </NavLink>
                <NavLink
                  to="/register"
                  className="inline-flex min-h-11 items-center justify-center px-3 py-2 rounded-full text-sm font-semibold bg-action text-on-action shadow-raised hover:bg-action-hover hover:text-on-action active:bg-action-active active:shadow-pressed hover:no-underline focus-visible:outline focus-visible:outline-focus"
                >
                  Registro
                </NavLink>
              </>
            )}
          </div>
        ) : null}
      </nav>

      <div className="hidden md:flex items-center gap-2 whitespace-nowrap">
        {isAuthed ? (
          <>
            <span className="hidden max-w-[12rem] truncate text-sm text-muted sm:inline">
              {user?.name}
            </span>
            <PrimaryButton variant="ghost" onClick={() => void logout()}>
              Salir
            </PrimaryButton>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink hover:no-underline"
            >
              Entrar
            </NavLink>
            <NavLink
              to="/register"
              className="inline-flex min-h-11 items-center justify-center px-3 py-2 rounded-full text-sm font-semibold bg-action text-on-action shadow-raised hover:bg-action-hover hover:text-on-action active:bg-action-active active:shadow-pressed hover:no-underline"
            >
              Registro
            </NavLink>
          </>
        )}
      </div>

      <button
        id="mobile-nav-btn"
        ref={menuButtonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="app-nav"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        className="lg:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-control text-ink shadow-low transition-colors hover:bg-surface-hover active:bg-surface-sunken active:shadow-pressed focus-visible:outline focus-visible:outline-focus"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          {open ? (
            <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
          ) : (
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </header>
  );
}
