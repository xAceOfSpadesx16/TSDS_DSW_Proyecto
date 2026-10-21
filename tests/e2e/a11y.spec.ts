import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test.describe('Movimiento reducido', () => {
  test('prefers-reduced-motion evita la animación de dados y ruleta', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/dice');
    await page.locator('[data-sides="6"]').click();
    await expect(page.locator('#dice-total')).toBeVisible();
    await expect(page.locator('#dice-result')).not.toHaveClass(
      /animate-dice-shake/,
    );

    await page.goto('/roulette');
    await page.locator('#roulette-spin-btn').click();
    await expect(page.locator('#roulette-result-overlay')).toBeVisible({
      timeout: 1000,
    });
  });
});

test.describe('Navegación y título', () => {
  test('el enlace de salto es el primer foco y el título normaliza la ruta', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    await page.goto('/dice/');
    await expect(page).toHaveTitle('Dados RPG · Thrive Randomizer');
    await page.goto('/DICE');
    await expect(page).toHaveTitle('Dados RPG · Thrive Randomizer');
  });
});

test.describe('404', () => {
  test('el enlace de vuelta es una sola parada de tabulación', async ({ page }) => {
    await page.goto('/ruta-inexistente');

    const back = page.getByRole('link', { name: 'Volver al inicio' });
    await expect(back).toHaveCount(1);
    await expect(page.locator('main a, main button')).toHaveCount(1);
    await expect(page.locator('main button')).toHaveCount(0);

    await back.focus();
    await expect(back).toBeFocused();
  });
});

test.describe('Accesibilidad (axe)', () => {
  for (const route of ROUTES) {
    test(`${route} sin violaciones serious ni critical`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === 'serious' || violation.impact === 'critical',
      );

      expect(
        blocking,
        blocking
          .map(
            (violation) =>
              `${violation.id} (${violation.impact}): ${violation.help}\n${violation.nodes
                .map((node) => `  ${node.target.join(' ')}`)
                .join('\n')}`,
          )
          .join('\n\n'),
      ).toEqual([]);
    });
  }
});
