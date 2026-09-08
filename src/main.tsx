import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { bindAuthStoreToHttpClient } from './store/authStore';
import { router } from './router';
import './index.css';

// Side-effect: registra el getter de token en el httpClient. Antes de
// que esto se ejecute, las requests salen anónimas (sin Authorization).
bindAuthStoreToHttpClient();

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