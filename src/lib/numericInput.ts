// =============================================================================
// numericInput
//
// Estado y helpers de los `<input type="number">` que aceptan un mínimo.
//
// El mínimo NO se aplica en `onChange`: si se aplicara, al borrar el campo
// saltaría al mínimo y al tipear el valor se concatenaría ("1" + "5" = 15).
// En su lugar el campo puede quedar vacío mientras se edita y el mínimo
// entra al salir del campo (`onBlur`) o al enviar el formulario.
// =============================================================================

/** Valor de un input numérico: `number`, o `''` mientras está vacío. */
export type NumericInput = number | '';

/** Lee un `<input type="number">` como `NumericInput` (vacío → `''`). */
export function readNumeric(raw: string): NumericInput {
  return raw === '' ? '' : Number(raw);
}

/** Aplica un mínimo a un input numérico, resolviendo el vacío al mínimo. */
export function clampMin(value: NumericInput, min: number): number {
  return value === '' || value < min ? min : value;
}

/**
 * Resuelve un input numérico a `number` para usarlo en el dominio.
 *
 * `clampMin` pero sin mínimo: el vacío se resuelve a `fallback` (0 por
 * defecto). Se usa en los campos sin cota inferior (mínimo y máximo de un
 * rango, por ejemplo).
 */
export function toNumberOr(value: NumericInput, fallback = 0): number {
  return value === '' ? fallback : value;
}
