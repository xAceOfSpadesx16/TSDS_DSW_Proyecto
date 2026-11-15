/** Configuración central de rutas del SPA. */

import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { RootLayout } from './components/RootLayout';
import { LandingPage } from './pages/LandingPage';
import { DicePage } from './pages/DicePage';
import { NumbersPage } from './pages/NumbersPage';
import { RoulettePage } from './pages/RoulettePage';
import { TeamsPage } from './pages/TeamsPage';
import { WeightedPage } from './pages/WeightedPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** Árbol de rutas. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'dice', element: <DicePage /> },
      { path: 'numbers', element: <NumbersPage /> },
      { path: 'roulette', element: <RoulettePage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'weighted', element: <WeightedPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/** Router de la aplicación. */
export const router = createBrowserRouter(routes);