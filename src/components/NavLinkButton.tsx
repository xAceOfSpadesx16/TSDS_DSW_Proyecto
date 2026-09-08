// =============================================================================
// NavLinkButton
//
// Botón-enlace usado en la barra de navegación. Replica exactamente los
// estilos del antiguo `index.html` (con la clase .nav-link presente para
// que `NavigationUI` legacy siga siendo identificable si alguna vez se
// agrega de vuelta) y aplica el resaltado activo de `NavLink`.
// =============================================================================

import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface Props {
  to: string;
  children: ReactNode;
}

const BASE =
  'inline-flex items-center gap-1 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light';
const ACTIVE = 'text-light-inverse bg-primary hover:text-light-inverse hover:bg-primary-dark';
const INACTIVE =
  'text-light-muted hover:text-light-text hover:bg-dark-surface hover:no-underline';

export function NavLinkButton({ to, children }: Props) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `nav-link ${BASE} ${isActive ? ACTIVE : INACTIVE}`
      }
    >
      {children}
    </NavLink>
  );
}