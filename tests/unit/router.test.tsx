// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';

import { routes } from '../../src/router';
import { useAuthStore } from '../../src/store/authStore';
import { installLocalStorage } from './helpers/localStorageMock';
import { mockCanvasContext } from './helpers/domMocks';

/**
 * Renderiza la config de rutas DENTRO de un MemoryRouter clásico (sin la ruta
 * de navegación basada en fetch de `RouterProvider`, incompatible con jsdom).
 * Se mapean explícitamente la ruta padre y sus hijas para conservar la
 * estructura de layouts del router real.
 */
function renderRoutes(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {routes.map((route, i) => (
          <Route
            key={i}
            path={route.path}
            element={route.element}
          >
            {route.children?.map((child, j) => (
              <Route
                key={j}
                path={child.path}
                element={child.element}
                index={child.index}
              />
            ))}
          </Route>
        ))}
      </Routes>
    </MemoryRouter>,
  );
}

describe('router', () => {
  beforeEach(() => {
    installLocalStorage();
    mockCanvasContext();
    useAuthStore.setState({
      user: null,
      token: null,
      expiresAt: null,
      status: 'idle',
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState({
      user: null,
      token: null,
      expiresAt: null,
      status: 'idle',
      error: null,
    });
    vi.restoreAllMocks();
  });

  describe('resolución de rutas', () => {
    const cases: Array<[string, string]> = [
      ['/', 'Thrive Randomizer'], // LandingPage (card de módulos)
      ['/teams', 'Generador de Equipos'],
      ['/weighted', 'Sorteo con Pesos'],
      ['/roulette', 'Ruleta de Decisiones'],
      ['/dice', 'Dados y Números'],
      ['/login', 'Iniciar sesión'],
      ['/register', 'Registro'],
    ];

    it.each(cases)('monta la vista correcta en %s', async (entry, heading) => {
      renderRoutes(entry);
      expect(
        await screen.findByRole('heading', { name: heading, level: 1 }),
      ).toBeInTheDocument();
    });

    it('en / renderiza la grilla de módulos (LandingPage)', async () => {
      renderRoutes('/');
      // La card del módulo es distinguible del enlace "Equipos" del Header.
      const card = await screen.findByRole('link', { name: /Generador de Equipos/ });
      expect(card).toHaveAttribute('href', '/teams');
    });
  });

  describe('rutas desconocidas (fallback 404)', () => {
    it.each(['/ruta-inexistente', '/abc/123'])('monta NotFoundPage en %s', async (entry) => {
      renderRoutes(entry);
      expect(await screen.findByText('404')).toBeInTheDocument();
      expect(
        await screen.findByText('La ruta solicitada no existe.'),
      ).toBeInTheDocument();
    });
  });

  describe('preservación del estado en navegación', () => {
    it('no resetea el almacén de autenticación al navegar entre rutas', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'Ada', email: 'ada@example.com' },
        token: 'session-token',
        expiresAt: null,
        status: 'idle',
        error: null,
      });

      // Navegación 1: / (Inicio).
      renderRoutes('/');
      expect(screen.getByRole('link', { name: /Generador de Equipos/ })).toBeInTheDocument();

      // Al navegar, los componentes se desmontan/remontan...
      cleanup();

      // ...y el almacén (singleton) conserva la sesión.
      renderRoutes('/teams');
      expect(screen.getByText('Generador de Equipos')).toBeInTheDocument();
      expect(useAuthStore.getState().token).toBe('session-token');
      expect(useAuthStore.getState().user).toMatchObject({ id: 1 });
    });
  });
});
