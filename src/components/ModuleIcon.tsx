// =============================================================================
// ModuleIcon
//
// Íconos SVG inline para los cinco módulos. Trazo de tinta sobre papel, sin
// glifos de ajedrez ni emojis: heredan el color del texto y son decorativos.
// =============================================================================

import type { ReactNode } from 'react';

export type ModuleIconName =
  | 'teams'
  | 'weighted'
  | 'roulette'
  | 'dice'
  | 'numbers';

const ICONS: Record<ModuleIconName, ReactNode> = {
  teams: (
    <>
      <circle cx="12" cy="6" r="2.6" />
      <circle cx="6" cy="17.5" r="2.4" />
      <circle cx="18" cy="17.5" r="2.4" />
      <path d="M12 8.8 7.5 15.4M12 8.8l4.5 6.6M8.4 17.5h7.2" />
    </>
  ),
  weighted: (
    <>
      <path d="M12 4.5v15M7.5 19.5h9M4 8h16" />
      <path d="M4 8 1.8 13h4.4L4 8ZM20 8l-2.2 5h4.4L20 8Z" />
    </>
  ),
  roulette: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.8 2.8M15.2 15.2 18 18M18 6l-2.8 2.8M8.8 15.2 6 18" />
    </>
  ),
  dice: (
    <g transform="rotate(-8 12 12)">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </g>
  ),
  numbers: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8.5" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="11" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="7" cy="17" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
};

interface Props {
  name: ModuleIconName;
  className?: string;
}

export function ModuleIcon({ name, className = 'h-7 w-7' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {ICONS[name]}
      <circle cx="19.5" cy="4.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
