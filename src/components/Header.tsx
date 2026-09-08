// =============================================================================
// Header
//
// Barra superior con marca + nav principal + acciones de auth. Replica
// `index.html` original: gradiente en la marca, `nav-link` en cada botón,
// botón de logout que reemplaza a "Iniciar sesión" cuando hay sesión.
// =============================================================================

import { NavLinkButton } from './NavLinkButton';
import { PrimaryButton } from './PrimaryButton';
import { useAuthStore, selectIsAuthenticated } from '../store/authStore';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const isAuthed = selectIsAuthenticated({ user, token } as never);

  return (
    <header
      className="flex items-center justify-between gap-2 px-4 bg-dark-bg-alt border-b border-dark-border sticky top-0 z-50"
      role="banner"
    >
      <NavLink
        to="/"
        end
        className="text-lg font-bold bg-gradient-to-br from-primary-light to-secondary bg-clip-text text-transparent hover:no-underline whitespace-nowrap"
      >
        Thrive Randomizer
      </NavLink>

      <nav
        className="app-nav flex items-center gap-1 overflow-x-auto"
        aria-label="Navegación principal"
      >
        <NavLinkButton to="/">Inicio</NavLinkButton>
        <NavLinkButton to="/teams">Equipos</NavLinkButton>
        <NavLinkButton to="/weighted">Sorteo</NavLinkButton>
        <NavLinkButton to="/roulette">Ruleta</NavLinkButton>
        <NavLinkButton to="/dice">Dados</NavLinkButton>
      </nav>

      <div className="flex items-center gap-2 whitespace-nowrap">
        {isAuthed ? (
          <>
            <span className="hidden sm:inline text-sm text-light-muted">
              {user?.name}
            </span>
            <PrimaryButton variant="ghost" onClick={() => void logout()}>
              Salir
            </PrimaryButton>
          </>
        ) : (
          <>
            <NavLink to="/login" className="text-sm font-semibold text-light-muted hover:text-light-text hover:no-underline">
              Entrar
            </NavLink>
            <NavLink
              to="/register"
              className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-semibold bg-primary text-light-inverse hover:bg-primary-dark hover:text-light-inverse hover:no-underline"
            >
              Registro
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}

// `NavLink` se usa dos veces: como botón aislado en el brand y dentro de
// `NavLinkButton`. Import local para mantener este archivo autocontenido.
import { NavLink } from 'react-router-dom';