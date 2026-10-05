// @vitest-environment jsdom
// =============================================================================
// pageUtils — utilería compartida para los tests de páginas.
//
// Centraliza el rellenado de campos usando el ciclo real de eventos del
// navegador (`@testing-library/user-event`) y selectores semánticos
// (`getByLabelText`), en vez de `document.querySelector` + `fireEvent.change`.
// Esto hace que los tests simulen foco/cambio real y dependan de la
// accesibilidad del componente (label asociado) en vez de IDs/CSS rígidos.
// =============================================================================

import { screen } from '@testing-library/react';
import type { API } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';

import { useAuthStore } from '../../../src/store/authStore';

/** Escapa un literal para usarlo dentro de una RegExp. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rellena un `<input>` controlado según su `<label>`, emulando el ciclo real
 * de eventos (foco → limpieza → tipeo). Devuelve el nodo por si el caso lo
 * necesita (ej.: toggle de checkbox).
 *
 * El `label` se combina en una RegExp anclada al inicio para tolerar campos
 * cuyo `<label>` incluye texto adicional (hints de validación).
 */
export async function fillByLabel(
  eventUser: API,
  label: string,
  value: string,
): Promise<HTMLInputElement> {
  const input = screen.getByLabelText(
    new RegExp(`^${escapeForRegExp(label)}`, 'i'),
  ) as HTMLInputElement;
  await eventUser.clear(input);
  // Un valor vacío no se "tipea" (userEvent.type('') lanzaría): se deja el
  // campo ya limpio tras el clear.
  if (value) {
    await eventUser.type(input, value);
  }
  return input;
}

/**
 * Resetea el store de autenticación a un estado vacío (sin sesión), listo
 * para re-renderizar una página en un test.
 */
export function resetAuthForTests(): void {
  useAuthStore.setState({
    user: null,
    token: null,
    expiresAt: null,
    status: 'idle',
    error: null,
  });
}

/** Instancia reutilizable de user-event para los tests de páginas. */
export function createUserEvent(): API {
  return userEvent.setup();
}
