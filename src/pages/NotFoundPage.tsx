// =============================================================================
// NotFoundPage (*)
//
// 404 simple para rutas inexistentes. Se muestra dentro del RootLayout
// (header arriba + grid principal).
// =============================================================================

import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="p-6 w-full mx-auto">
      <section className="max-w-md mx-auto animate-fade-in flex flex-col items-center gap-4 py-12 text-center">
        <h1
          tabIndex={-1}
          className="font-bold text-ink"
        >
          404
        </h1>
        <p className="text-lg text-muted">La ruta solicitada no existe.</p>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-action px-4 py-2 text-sm font-semibold text-on-action no-underline shadow-raised transition-colors hover:bg-action-hover hover:text-on-action active:bg-action-active active:shadow-pressed focus-visible:outline focus-visible:outline-focus"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}