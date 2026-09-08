import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SPA rewrite: cualquier ruta no-asset cae a index.html para que React
// Router pueda gestionar rutas profundas en `vite dev` y `vite preview`.
// La SPA queda servida por `npm run dev` (puerto 5173 por defecto).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
  },
});
