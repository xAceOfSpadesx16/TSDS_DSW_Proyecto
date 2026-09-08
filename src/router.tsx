// =============================================================================
// router
//
// Configuración central de rutas del SPA. Usa `createBrowserRouter` (v7)
// para URLs limpias (`/dice`, `/roulette`, etc.). El dev server de Vite
// ya está configurado para hacer fallback de 404 a index.html.
// =============================================================================

import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { RootLayout } from './components/RootLayout';
import { LandingPage } from './pages/LandingPage';
import { DicePage } from './pages/DicePage';
import { RoulettePage } from './pages/RoulettePage';
import { TeamsPage } from './pages/TeamsPage';
import { WeightedPage } from './pages/WeightedPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'dice', element: <DicePage /> },
      { path: 'roulette', element: <RoulettePage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'weighted', element: <WeightedPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);