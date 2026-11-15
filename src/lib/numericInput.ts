/** Estado y helpers de los inputs numéricos que aceptan un mínimo. */

/** Valor de un input numérico: número o vacío mientras se edita. */
export type NumericInput = number | '';

/** Lee un `<input type="number">` como `NumericInput`. */
export function readNumeric(raw: string): NumericInput {
  return raw === '' ? '' : Number(raw);
}

/** Aplica un mínimo y resuelve el vacío al mínimo. */
export function clampMin(value: NumericInput, min: number): number {
  return value === '' || value < min ? min : value;
}

/** Resuelve un input numérico a número, con `fallback` para el vacío. */
export function toNumberOr(value: NumericInput, fallback = 0): number {
  return value === '' ? fallback : value;
}
