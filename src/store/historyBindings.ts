/** Enlace entre el estado de sesión y el historial. */

import { selectIsAuthenticated, useAuthStore } from './authStore';
import { useHistoryStore } from './historyStore';

let bound = false;

/** Recarga o vacía el historial cuando cambia la sesión. */
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
      useHistoryStore.getState().requestGuestImport();
      void useHistoryStore.getState().load();
    } else {
      useHistoryStore.getState().loadGuest();
    }
  });
}

/** Carga el historial correspondiente al arrancar la app. */
export function syncHistoryOnStartup(): void {
  if (selectIsAuthenticated(useAuthStore.getState())) {
    void useHistoryStore.getState().load();
  } else {
    useHistoryStore.getState().loadGuest();
  }
}
