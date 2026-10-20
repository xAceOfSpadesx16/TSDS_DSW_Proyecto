// =============================================================================
// historyBindings
//
// Enlaza los dos stores entre sí: cuando cambia el estado de sesión, el
// historial se recarga (login / registro / hydrate) o se vacía (logout).
//
// Vive en su propio archivo a propósito: `authStore` y `historyStore`
// ninguno importa al otro. Si el enlace estuviera dentro de cualquiera de
// los dos, uno tendría que importar al peer y volveríamos a un import
// circular. Acá los dos son hojas y este módulo es el único que los conoce
// a ambos.
//
// Se llama una sola vez desde `main.tsx`, junto al binding del httpClient.
//
// Nota: `historyStore` sí importa `authStore` (necesita `selectIsAuthenticated`
// para decidir si toca el backend). Lo que este módulo garantiza es la otra
// dirección: ningún store importa al binding, así que el grafo no es circular.
// =============================================================================

import { selectIsAuthenticated, useAuthStore } from './authStore';
import { useHistoryStore } from './historyStore';

let bound = false;

/**
 * Sincroniza el historial con los cambios de sesión.
 *
 * - Entra a una sesión → `load()`, que internamente reenvía primero los
 *   sorteos pendientes del usuario que acaba de entrar y después trae la
 *   página 1 del backend. Los pendientes de otra cuenta se descartan
 *   adentro de `load()`; las entradas de invitado no se migran (§2).
 * - Sale de la sesión → `clear()` vacía la lista.
 *
 * Es idempotente: llamarlo más de una vez no duplica suscripciones.
 */
export function bindHistoryToAuth(): void {
  if (bound) {
    return;
  }
  bound = true;

  useAuthStore.subscribe((state, prev) => {
    const authenticated = selectIsAuthenticated(state);
    if (authenticated === selectIsAuthenticated(prev)) {
      return;
    }

    if (authenticated) {
      void useHistoryStore.getState().load();
    } else {
      void useHistoryStore.getState().clear();
    }
  });
}

/**
 * Carga el historial si al arrancar ya hay una sesión.
 *
 * Va aparte de `bindHistoryToAuth()` porque la suscripción solo reacciona a
 * *cambios* de estado, y en el arranque la sesión restaurada de
 * `localStorage` ya estaba "autenticada": no hay transición que ver.
 *
 * Se llama después de `hydrate()`, para no pedir el historial con una
 * sesión que `hydrate()` todavía puede terminar descartando.
 */
export function syncHistoryOnStartup(): void {
  if (selectIsAuthenticated(useAuthStore.getState())) {
    void useHistoryStore.getState().load();
  } else {
    useHistoryStore.getState().clear();
  }
}
