// =============================================================================
// Field
//
// Wrapper para inputs con label asociado. Aísla la accesibilidad (`htmlFor`,
// `aria-required`, `aria-invalid`, `aria-describedby` y mensajes de error)
// para que cada página lo consuma sin repetir boilerplate.
// =============================================================================

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
}

export function Field({ label, hint, error, id, ...rest }: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter((value): value is string => value !== null)
    .join(' ');

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={fieldId} className="text-muted font-medium">
        {label}
      </label>
      <input
        {...rest}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className={`min-h-11 w-full min-w-0 px-3 py-2 rounded-md bg-surface border shadow-pressed ${
          error ? 'border-danger' : 'border-control'
        } text-ink placeholder:text-muted focus-visible:outline focus-visible:outline focus-visible:outline-focus disabled:bg-surface-sunken disabled:text-muted`}
      />
      {hint ? (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
