import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { bindAuthStoreToHttpClient, useAuthStore } from './store/authStore';
import { bindHistoryToAuth, syncHistoryOnStartup } from './store/historyBindings';
import { router } from './router';
import './index.css';

// Side-effect: registra el getter de token en el httpClient. Antes de
// que esto se ejecute, las requests salen anónimas (sin Authorization).
bindAuthStoreToHttpClient();

// Reacciona a los cambios de sesión para recargar o vaciar el historial.
bindHistoryToAuth();

// Revalida la sesión persistida contra /auth/me. No bloqueamos el render:
// la UI parte del estado restaurado de localStorage y se corrige sola si
// el backend rechaza el token. El historial se sincroniza al terminar,
// porque antes no sabemos si la sesión va a sobrevivir.
void useAuthStore
  .getState()
  .hydrate()
  .finally(() => syncHistoryOnStartup());

// Punto de entrada del SPA. El árbol completo cuelga de RouterProvider,
// que se encarga del enrutado (BrowserRouter configurado en router.tsx).
const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Elemento #root no encontrado en index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);