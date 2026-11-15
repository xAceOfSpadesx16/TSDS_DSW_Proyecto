/** Punto de entrada del SPA. */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { bindAuthStoreToHttpClient, useAuthStore } from './store/authStore';
import { bindHistoryToAuth, syncHistoryOnStartup } from './store/historyBindings';
import { router } from './router';
import './index.css';

bindAuthStoreToHttpClient();
bindHistoryToAuth();

void useAuthStore
  .getState()
  .hydrate()
  .finally(() => syncHistoryOnStartup());

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Elemento #root no encontrado en index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);