import { test, expect } from '@playwright/test';

import { makeUser, mockBackend } from '../helpers/api-mock';
import { AuthPage } from '../pages/auth-page';

const ROUTES = [
  '/',
  '/dice',
  '/numbers',
  '/teams',
  '/weighted',
  '/roulette',
  '/login',
  '/register',
  '/ruta-inexistente',
];

const WIDTHS = [320, 390, 768, 1024, 1440];

test.describe('Responsive', () => {
  test('no hay scroll horizontal en ninguna ruta ni ancho', async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ROUTES) {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();

        const dimensions = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(
          dimensions.scrollWidth,
          `${route} desborda a ${width}px (${dimensions.scrollWidth} > ${dimensions.innerWidth})`,
        ).toBeLessThanOrEqual(dimensions.innerWidth);
      }
    }
  });

  test('en 390 el botón principal y el resultado de cada sorteo quedan a la vista', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const viewport = page.viewportSize()!;

    const inViewport = async (locator: ReturnType<typeof page.locator>) => {
      const box = await locator.boundingBox();
      expect(box, 'el elemento debe tener caja').not.toBeNull();
      expect(box!.y, 'no debe quedar arriba del viewport').toBeGreaterThanOrEqual(0);
      expect(
        box!.y + box!.height,
        'no debe quedar debajo del viewport',
      ).toBeLessThanOrEqual(viewport.height);
      expect(box!.x, 'no debe quedar a la izquierda').toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, 'no debe desbordar a la derecha').toBeLessThanOrEqual(
        viewport.width,
      );
    };

    await page.goto('/dice');
    await page.locator('[data-sides="6"]').click();
    await page.locator('#dice-total').waitFor();
    await inViewport(page.locator('#dice-total'));

    await page.goto('/numbers');
    await page.locator('#generate-numbers-btn').click();
    await page.locator('#numbers-result').waitFor();
    await inViewport(page.locator('#generate-numbers-btn'));
    await inViewport(page.locator('#numbers-result'));

    await page.goto('/teams');
    await page.locator('#team-participants').fill('Ana\nBruno\nCarla\nDiego');
    await page.locator('#generate-teams-btn').click();
    await page.locator('#team-results').waitFor();
    await inViewport(page.locator('#generate-teams-btn'));
    await inViewport(page.locator('#team-results'));

    await page.goto('/weighted');
    await page.locator('#weighted-name').fill('Ana');
    await page.locator('#weighted-form button[type="submit"]').click();
    await page.locator('#weighted-draw-btn').click();
    await page.locator('#weighted-result').waitFor();
    await inViewport(page.locator('#weighted-draw-btn'));
    await inViewport(page.locator('#weighted-result'));

    await page.goto('/roulette');
    await inViewport(page.locator('#roulette-spin-btn'));
    await inViewport(page.locator('#roulette-canvas'));
  });

  test('no hay scroll horizontal con contenido largo', async ({ page }) => {
    const long = 'A'.repeat(120);
    const expectNoOverflow = async (label: string) => {
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        dimensions.scrollWidth,
        `${label} desborda (${dimensions.scrollWidth} > ${dimensions.clientWidth})`,
      ).toBeLessThanOrEqual(dimensions.clientWidth);
    };

    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      // Cada ancho parte sin las opciones/exclusiones persistidas del anterior.
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());

      await page.goto('/roulette');
      await page.locator('#roulette-label').fill(long);
      await page.getByRole('button', { name: 'Agregar opción' }).click();
      await expectNoOverflow(`/roulette @ ${width}`);

      await page.goto('/teams');
      const longA = `${long}A`;
      const longB = `${long}B`;
      await page.locator('#team-participants').fill(`${longA}\n${longB}\nC`);
      await page.locator('#generate-teams-btn').click();
      await page.locator('#team-results').waitFor();
      await expectNoOverflow(`/teams @ ${width}`);

      await page.getByText('Reglas avanzadas (exclusiones)').click();
      await page.locator('#exclusion-a').selectOption(longA);
      await page.locator('#exclusion-b').selectOption(longB);
      await page.locator('#add-exclusion-btn').click();
      await expectNoOverflow(`/teams exclusión larga @ ${width}`);

      await page.locator('#exclusion-a').selectOption(longA);
      await page.locator('#exclusion-b').selectOption('C');
      await page.locator('#add-exclusion-btn').click();
      await page.locator('#exclusion-a').selectOption(longB);
      await page.locator('#exclusion-b').selectOption('C');
      await page.locator('#add-exclusion-btn').click();
      await page.locator('#generate-teams-btn').click();
      await page.getByRole('alert').waitFor();
      await expectNoOverflow(`/teams error de exclusión @ ${width}`);

      await page.goto('/weighted');
      await page.locator('#weighted-name').fill(long);
      await page.locator('#weighted-form button[type="submit"]').click();
      await page.locator('#weighted-draw-btn').click();
      await page.locator('#weighted-result').waitFor();
      await expectNoOverflow(`/weighted @ ${width}`);

      await page.locator('#history-toggle-btn').click();
      await expectNoOverflow(`/weighted + historial @ ${width}`);
      await page.locator('#history-toggle-btn').click();
    }
  });

  test('logout en mobile y nombre de usuario largo sin desborde', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const user = makeUser({ name: 'A'.repeat(100) });
    await mockBackend(page, user);
    const auth = new AuthPage(page);

    await page.goto('/');
    await auth.gotoLogin();
    await auth.login({ email: user.email, password: user.password });
    await page.waitForURL('/');

    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const panel = page.locator('#app-nav');
    const logout = panel.getByRole('button', { name: 'Salir' });
    await expect(logout).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    await logout.click();
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
  });

  test('el menú móvil se abre con teclado y se cierra con Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const openButton = page.getByRole('button', { name: 'Abrir menú' });
    await openButton.focus();
    await page.keyboard.press('Enter');

    const closeButton = page.getByRole('button', { name: 'Cerrar menú' });
    await expect(closeButton).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.locator('#app-nav').getByRole('link', { name: 'Equipos', exact: true }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('el historial móvil se abre como panel inferior y se puede colapsar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dice');

    const toggle = page.locator('#history-toggle-btn');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('Historial');
    await toggle.click();

    const aside = page.locator('#history-aside');
    await expect(aside).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ocultar historial' })).toBeVisible();

    const collapse = page.getByRole('button', { name: 'Ocultar historial' });
    await collapse.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Mostrar historial' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
