// =============================================================================
// Field
//
// Wrapper para inputs con label asociado. Aísla la accesibilidad (`htmlFor`,
// `aria-required`, mensajes de error) para que cada página lo consuma sin
// repetir boilerplate.
// =============================================================================

import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
}

export function Field({ label, hint, error, id, ...rest }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-light-muted font-medium">{label}</span>
      <input
        {...rest}
        id={id}
        aria-invalid={Boolean(error)}
        className={`px-3 py-2 rounded-md bg-dark-surface border ${
          error ? 'border-danger' : 'border-dark-border'
        } text-light-text placeholder:text-light-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light`}
      />
      {hint ? <span className="text-xs text-light-muted">{hint}</span> : null}
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}