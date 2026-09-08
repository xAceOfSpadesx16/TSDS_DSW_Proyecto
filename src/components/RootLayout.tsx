// =============================================================================
// RootLayout
//
// Estructura común a todas las páginas autenticadas: Header + grid principal
// + outlet de React Router. La página decide si renderiza el HistoryAside
// dentro del slot derecho del grid (la home lo omite).
// =============================================================================

import { Outlet } from 'react-router-dom';

import { Header } from './Header';

export function RootLayout() {
  return (
    <div className="min-h-screen grid grid-rows-[3.5rem_1fr] bg-dark-bg text-light-text font-sans antialiased">
      <Header />
      <Outlet />
    </div>
  );
}