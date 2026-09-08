// =============================================================================
// NotFoundPage (*)
//
// 404 simple para rutas inexistentes. Se muestra dentro del RootLayout
// (header arriba + grid principal).
// =============================================================================

import { Link } from 'react-router-dom';

import { PrimaryButton } from '../components/PrimaryButton';

export function NotFoundPage() {
  return (
    <main className="p-6 w-full mx-auto" role="main">
      <section className="max-w-md mx-auto animate-fade-in flex flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-br from-primary-light to-secondary bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-lg text-light-muted">La ruta solicitada no existe.</p>
        <Link to="/" className="no-underline">
          <PrimaryButton variant="primary">Volver al inicio</PrimaryButton>
        </Link>
      </section>
    </main>
  );
}