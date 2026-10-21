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

  for (const viewport of [
    { width: 320, height: 667 },
    { width: 390, height: 667 },
    { width: 390, height: 844 },
  ]) {
    test(`en ${viewport.width}×${viewport.height} el botón principal y el resultado de cada sorteo quedan a la vista`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const inViewport = async (
        locator: ReturnType<typeof page.locator>,
        label: string,
      ) => {
        const box = await locator.boundingBox();
        expect(box, `${label}: el elemento debe tener caja`).not.toBeNull();
        expect(box!.y, `${label}: no debe quedar arriba`).toBeGreaterThanOrEqual(0);
        expect(
          box!.y + box!.height,
          `${label}: no debe quedar debajo`,
        ).toBeLessThanOrEqual(viewport.height);
        expect(box!.x, `${label}: no debe quedar a la izquierda`).toBeGreaterThanOrEqual(0);
        expect(
          box!.x + box!.width,
          `${label}: no debe desbordar a la derecha`,
        ).toBeLessThanOrEqual(viewport.width);
      };

      await page.goto('/dice');
      await inViewport(page.locator('[data-sides="6"]'), 'dado d6');
      await page.locator('[data-sides="6"]').click();
      await expect(page.locator('#dice-total')).toBeVisible();
      await inViewport(page.locator('#dice-total'), 'resultado de dados');

      await page.goto('/numbers');
      await inViewport(page.locator('#generate-numbers-btn'), 'botón de números');
      await page.locator('#generate-numbers-btn').click();
      await expect(page.locator('#numbers-result')).toBeVisible();
      await inViewport(page.locator('#numbers-result'), 'resultado de números');
      await inViewport(page.locator('#generate-numbers-btn'), 'botón de números tras el resultado');

      await page.goto('/teams');
      await page.locator('#team-participants').fill('Ana\nBruno\nCarla\nDiego');
      await inViewport(page.locator('#generate-teams-btn'), 'botón de equipos');
      await page.locator('#generate-teams-btn').click();
      await expect(page.locator('#team-results')).toBeVisible();
      await inViewport(page.locator('#team-results'), 'resultado de equipos');
      await inViewport(page.locator('#generate-teams-btn'), 'botón de equipos tras el resultado');

      await page.goto('/weighted');
      await page.locator('#weighted-name').fill('Ana');
      await page.locator('#weighted-form button[type="submit"]').click();
      await inViewport(page.locator('#weighted-draw-btn'), 'botón de ponderado');
      await page.locator('#weighted-draw-btn').click();
      await expect(page.locator('#weighted-result')).toBeVisible();
      await expect(page.locator('#weighted-result-heading')).toBeFocused();
      await inViewport(page.locator('#weighted-result'), 'resultado de ponderado');
      await inViewport(page.locator('#weighted-draw-btn'), 'botón de ponderado tras el resultado');
      if (viewport.height < 844) {
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      }

      await page.goto('/roulette');
      await inViewport(page.locator('#roulette-spin-btn'), 'botón de ruleta');
      await inViewport(page.locator('#roulette-canvas'), 'ruleta');
      await page.locator('#roulette-spin-btn').click();
      const dialog = page.locator('#roulette-result-overlay');
      await expect(dialog).toBeVisible();
      await inViewport(dialog, 'resultado de ruleta');
    });
  }

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
      const optionsDetails = page.locator('#roulette-options-details');
      if ((await optionsDetails.getAttribute('open')) === null) {
        await optionsDetails.locator('summary').click();
      }
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
