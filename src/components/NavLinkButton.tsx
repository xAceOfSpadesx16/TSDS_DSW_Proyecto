/** Enlace de navegación con estilo de botón. */

import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface Props {
  to: string;
  children: ReactNode;
}

const BASE =
  'inline-flex min-h-11 items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-focus';
const ACTIVE =
  'text-on-action bg-action shadow-raised hover:text-on-action hover:bg-action-hover active:bg-action-active active:shadow-pressed';
const INACTIVE =
  'text-muted hover:text-ink hover:bg-surface-hover active:bg-surface-sunken hover:no-underline';

/** Enlace de la barra de navegación que resalta la ruta activa. */
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
