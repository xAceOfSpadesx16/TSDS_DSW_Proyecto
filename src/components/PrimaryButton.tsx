// =============================================================================
// PrimaryButton
//
// Botón principal de los formularios, con foco accesible y variantes
// (`variant`: primary | ghost | accent | danger). La piel viene de los
// tokens de la dirección "Papel de goma".
// =============================================================================

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'accent' | 'danger';
  children: ReactNode;
}

const VARIANTS: Record<NonNullable<Props['variant']>, string> = {
  primary:
    'bg-action text-on-action shadow-raised hover:bg-action-hover hover:text-on-action active:bg-action-active active:shadow-pressed disabled:bg-surface-sunken disabled:text-muted disabled:shadow-none',
  ghost:
    'bg-transparent text-ink border border-control shadow-low hover:bg-surface-hover hover:border-action active:bg-surface-sunken active:shadow-pressed disabled:text-muted disabled:bg-surface-sunken',
  accent:
    'bg-action text-on-action shadow-raised hover:bg-action-hover active:bg-action-active active:shadow-pressed disabled:bg-surface-sunken disabled:text-muted disabled:shadow-none',
  danger:
    'bg-danger text-on-action shadow-raised hover:bg-danger-dark active:bg-danger-active active:shadow-pressed disabled:bg-surface-sunken disabled:text-muted disabled:shadow-none',
};

export function PrimaryButton({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-[background-color,color,box-shadow] focus-visible:outline focus-visible:outline-focus disabled:cursor-not-allowed disabled:border disabled:border-control ${
        VARIANTS[variant]
      } ${className}`}
    >
      {children}
    </button>
  );
}
