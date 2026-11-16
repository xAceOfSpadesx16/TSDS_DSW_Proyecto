/** Enlace de navegación con estilo de botón. */

import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface Props {
  to: string;
  children: ReactNode;
}

const BASE =
  'inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] focus-visible:outline focus-visible:outline-focus';
const ACTIVE =
  'text-action bg-surface-sunken border-action shadow-pressed hover:text-action hover:bg-surface-hover active:shadow-pressed';
const INACTIVE =
  'text-muted bg-surface border-transparent shadow-low hover:text-ink hover:bg-surface-hover hover:border-control active:text-action active:bg-surface-sunken active:shadow-pressed hover:no-underline';

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
