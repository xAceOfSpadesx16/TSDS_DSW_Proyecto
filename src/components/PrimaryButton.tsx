// =============================================================================
// PrimaryButton
//
// Botón principal de los formularios, con foco accesible y variantes
// (`variant`: primary | ghost | accent | danger). Replica los estilos del
// frontend original.
// =============================================================================

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'accent' | 'danger';
  children: ReactNode;
}

const VARIANTS: Record<NonNullable<Props['variant']>, string> = {
  primary:
    'bg-primary text-light-inverse hover:bg-primary-dark hover:text-light-inverse disabled:bg-dark-surface disabled:text-light-muted',
  ghost:
    'bg-transparent text-light-text border border-dark-border hover:bg-dark-surface hover:border-primary-light disabled:text-light-muted',
  accent:
    'bg-accent text-light-inverse hover:bg-accent-hover disabled:bg-dark-surface disabled:text-light-muted',
  danger:
    'bg-danger text-light-inverse hover:bg-danger-dark disabled:bg-dark-surface disabled:text-light-muted',
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
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light disabled:cursor-not-allowed ${
        VARIANTS[variant]
      } ${className}`}
    >
      {children}
    </button>
  );
}