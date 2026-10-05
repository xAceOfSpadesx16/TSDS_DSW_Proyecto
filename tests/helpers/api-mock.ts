// =============================================================================
// api-mock — intercepta las llamadas a la API del backend en los E2E.
//
// Los tests NO requieren un backend vivo: cada spec fija las respuestas con
// route.fulfill, así son autosuficientes y deterministas (principio 2.2 del
// plan de pruebas). Las rutas coinciden por segmento final, así no importa
// qué host apunte `VITE_API_BASE_URL`.
// =============================================================================

import type { Page } from '@playwright/test';

export interface MockUser {
  id: number;
  name: string;
  email: string;
  password: string;
}

export function makeUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 1,
    name: 'Ana Tester',
    email: 'ana@thrivelocal.test',
    password: 'password123',
    ...overrides,
  };
}

function authResponse(user: MockUser, expiresIn = 3600) {
  return {
    user,
    token: `mock.jwt.${Math.random().toString(36).slice(2)}`,
    token_type: 'bearer',
    expires_in: expiresIn,
  };
}

export interface MockBackendOptions {
  /** Si se pasa, POST /api/auth/login responde 422 con ese mensaje. */
  rejectLoginWith?: string;
}

/**
 * Conecta todas las rutas de la API contra respuestas mockeadas.
 * Devuelve un arreglo con las rutas registradas (útil para `unroute` si hace
 * falta en specs con múltiples escenarios).
 */
export function mockBackend(page: Page, user: MockUser, options: MockBackendOptions = {}) {
  const routes: ReturnType<Page['route']>[] = [];

  routes.push(
    page.route('**/api/auth/register', (route) => {
      route.fulfill({ status: 201, json: authResponse(user) });
    }),
  );

  routes.push(
    page.route('**/api/auth/login', (route) => {
      if (options.rejectLoginWith) {
        route.fulfill({
          status: 422,
          contentType: 'application/json',
          json: {
            message: 'Los datos introducidos no son válidos.',
            errors: { email: [options.rejectLoginWith] },
          },
        });
        return;
      }
      route.fulfill({ status: 200, json: authResponse(user) });
    }),
  );

  routes.push(
    page.route('**/api/auth/me', (route) => {
      route.fulfill({ status: 200, json: { user } });
    }),
  );

  routes.push(
    page.route('**/api/auth/logout', (route) => {
      route.fulfill({ status: 204 });
    }),
  );

  // Persistencia de historial (POST /api/history). El frontend espera
  // `{ data: HistoryRecord }`.
  routes.push(
    page.route('**/api/history', (route) => {
      const record = {
        id: `be-${Math.random().toString(36).slice(2)}`,
        user_id: user.id,
        module_name: 'dice',
        action: 'roll',
        payload: {},
        result: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      route.fulfill({ status: 201, json: { data: record } });
    }),
  );

  return routes;
}
