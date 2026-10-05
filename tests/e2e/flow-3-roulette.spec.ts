import { test, expect } from '@playwright/test';
import { mockBackend, makeUser } from '../helpers/api-mock';
import { AuthPage } from '../pages/auth-page';
import { HistoryAside } from '../pages/history-aside';
import { RoulettePage } from '../pages/roulette-page';

const user = makeUser();

test.describe('Flow 3 — Roulette full flow', () => {
  test('add options, spin and resolve a winner among them', async ({ page }) => {
    const roulette = new RoulettePage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await roulette.goto();

    await roulette.clear();
    await roulette.addOption('Pizza', '#ef4444');
    await roulette.addOption('Sushi', '#22c55e');
    await roulette.addOption('Tacos', '#3b82f6');
    expect(await roulette.optionCount()).toBe(3);

    await roulette.spin();
    const winner = await roulette.winner();
    expect(winner, 'a winner must be displayed').not.toBeNull();
    expect(['Pizza', 'Sushi', 'Tacos']).toContain(winner);

    await roulette.closeResult();
    expect(await roulette.hasResultDialog()).toBe(false);
  });

  test('removing an option shrinks the wheel before spinning', async ({ page }) => {
    const roulette = new RoulettePage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await roulette.goto();

    await roulette.clear();
    await roulette.addOption('Rojo', '#ef4444');
    await roulette.addOption('Verde', '#22c55e');
    await roulette.addOption('Azul', '#3b82f6');
    expect(await roulette.optionCount()).toBe(3);

    await roulette.removeOption('Verde');
    expect(await roulette.optionCount()).toBe(2);

    await roulette.spin();
    const winner = await roulette.winner();
    expect(winner).not.toBeNull();
    expect(['Rojo', 'Azul']).toContain(winner);
  });

  test('el botón girar se deshabilita mientras la ruleta gira', async ({
    page,
  }) => {
    const roulette = new RoulettePage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await roulette.goto();

    await roulette.clear();
    await roulette.addOption('Rojo', '#ef4444');
    await roulette.addOption('Verde', '#22c55e');
    expect(await roulette.isSpinDisabled()).toBe(false);

    // Al girar, el botón queda deshabilitado hasta que termina la animación
    // (evita giros múltiples). toBeDisabled() espera el re-render.
    await page.locator('#roulette-spin-btn').click();
    await expect(page.locator('#roulette-spin-btn')).toBeDisabled();
  });

  test('a logged-in user records the spin in their synced history', async ({ page }) => {
    const auth = new AuthPage(page);
    const history = new HistoryAside(page);
    const roulette = new RoulettePage(page);

    await mockBackend(page, user);

    await page.goto('/');
    await page.waitForURL('/');
    await auth.gotoLogin();
    await auth.login({ email: user.email, password: user.password });
    await page.waitForURL('/');

    await roulette.goto();
    await roulette.addOption('Café', '#a855f7');
    await roulette.addOption('Té', '#84cc16');
    await roulette.spin();
    await roulette.winner();

    expect(await history.entryCount()).toBe(1);
    expect(await history.latestSynced()).toBe(true);
  });
});
