// =============================================================================
// Flujo 1 — Ciclo de autenticación (PLAN 4.8.1).
// Registro → sesión activa (Header) → cierre de sesión.
// =============================================================================

import { expect, test } from '@playwright/test';

import { AuthPage } from '../pages/auth-page';
import { LandingPage } from '../pages/landing-page';
import { mockBackend, makeUser } from '../helpers/api-mock';

const user = makeUser({ name: 'Ana Tester', email: 'ana@thrivelocal.test' });

test.describe('Flujo 1 — Ciclo de autenticación', () => {
  test('registro crea sesión y el Header muestra al usuario', async ({
    page,
  }) => {
    const auth = new AuthPage(page);
    const landing = new LandingPage(page);

    mockBackend(page, user);

    await auth.gotoRegister();
    await auth.register(user);

    // Tras el registro se redirige a la portada con la sesión activa.
    await expect(page).toHaveURL('/');
    expect(await landing.hasHeading()).toBe(true);
    expect(await auth.isLoggedIn()).toBe(true);
    expect(await auth.currentUserName()).toBe(user.name);
  });

  test('inicio de sesión activa el Header', async ({ page }) => {
    const auth = new AuthPage(page);
    mockBackend(page, user);

    await auth.gotoLogin();
    await auth.login({ email: user.email, password: 'password123' });

    await expect(page).toHaveURL('/');
    expect(await auth.isLoggedIn()).toBe(true);
    expect(await auth.currentUserName()).toBe(user.name);
  });

  test('cierre de sesión restaura el Header anónimo', async ({ page }) => {
    const auth = new AuthPage(page);
    mockBackend(page, user);

    await auth.gotoLogin();
    await auth.login({ email: user.email, password: 'password123' });
    expect(await auth.isLoggedIn()).toBe(true);

    await auth.logout();

    expect(await auth.loggedOut()).toBe(true);
  });

  test('login con email no registrado muestra error 422', async ({ page }) => {
    const auth = new AuthPage(page);

    // El backend rechaza el login con 422 y el mensaje del campo.
    mockBackend(page, user, {
      rejectLoginWith: 'Este email no está registrado.',
    });

    await auth.gotoLogin();
    await auth.login({ email: 'nadie@thrivelocal.test', password: 'password123' });

    await expect(page).toHaveURL('/login');
    expect(await auth.globalError()).toContain(
      'Este email no está registrado.',
    );
  });

  test('la sesión persiste al recargar la página (token en localStorage)', async ({
    page,
  }) => {
    const auth = new AuthPage(page);
    mockBackend(page, user);

    await auth.gotoLogin();
    await auth.login({ email: user.email, password: 'password123' });
    await expect(page).toHaveURL('/');
    expect(await auth.isLoggedIn()).toBe(true);

    // Recargar: el token persistido en localStorage debe hacer que la sesión
    // vuelva a activarse sin iniciar sesión de nuevo.
    await page.reload();
    await expect(page).toHaveURL('/');
    expect(
      await auth.isLoggedIn(),
      'la sesión debe persistir tras recargar la página',
    ).toBe(true);
    expect(await auth.currentUserName()).toBe(user.name);
  });
});
