import { test, expect } from '@playwright/test';
import { mockBackend, makeUser } from '../helpers/api-mock';
import { AuthPage } from '../pages/auth-page';
import { HistoryAside } from '../pages/history-aside';
import { WeightedPage } from '../pages/weighted-page';

const user = makeUser();

test.describe('Flow 5 — Weighted draw with auto-removal', () => {
  test('auto-removal drops the winner from the pool on draw', async ({ page }) => {
    const weighted = new WeightedPage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await weighted.goto();

    await weighted.addEntry('Cupcake', 1);
    await weighted.addEntry('Brownie', 5);
    await weighted.addEntry('Tarta', 2);
    expect(await weighted.entryCount()).toBe(3);

    await weighted.setAutoRemove(true);

    // La lista antes del sorteo: el sorteo es aleatorio (ponderado), así que
    // NO podemos asumir quién gana. La capturamos para comparar después.
    const before = await weighted.entries();
    expect(before).toEqual(['Cupcake', 'Brownie', 'Tarta']);

    await weighted.draw();
    const winner = await weighted.winner();
    expect(winner, 'a winner must be displayed').not.toBeNull();
    expect(before).toContain(winner);

    // With auto-removal the winner is dropped from the pool, and only the
    // other two remain — regardless of who won.
    const after = await weighted.entries();
    expect(after).not.toContain(winner);
    expect(after.length).toBe(2);
    expect(after).toEqual(before.filter((name) => name !== winner));
  });

  test('el botón reinicio restaura la lista original tras un auto-eliminado', async ({
    page,
  }) => {
    const weighted = new WeightedPage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await weighted.goto();

    await weighted.addEntry('Cupcake', 1);
    await weighted.addEntry('Brownie', 5);
    await weighted.addEntry('Tarta', 3);
    await weighted.setAutoRemove(true);
    expect(await weighted.entryCount()).toBe(3);

    await weighted.draw();
    // Se espera a que la lista se asiente (el draw tiene trabajo asíncrono
    // pendiente: la sincronización del historial). Sin esta espera reactiva,
    // el reset puede dispararse antes de que React aplique `setEntries(2)`.
    await expect(page.locator('#weighted-list > li')).toHaveCount(2);

    // El reinicio restaura la lista original (las 3 entradas).
    await weighted.reset();
    await expect(page.locator('#weighted-list > li')).toHaveCount(3);
  });

  test('weights bias the result toward the heavier entry', async ({ page }) => {
    const weighted = new WeightedPage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await weighted.goto();

    await weighted.addEntry('Perdedor', 1);
    await weighted.addEntry('Ganador', 50);
    await weighted.setAutoRemove(false);

    // Repeated draws should surface the heavily-weighted entry most often.
    let wins = 0;
    const rounds = 15;
    for (let i = 0; i < rounds; i++) {
      await weighted.draw();
      if ((await weighted.winner()) === 'Ganador') wins++;
    }
    expect(
      wins,
      'the 50-weight entry should win the majority of draws',
    ).toBeGreaterThan(rounds / 2);
  });

  test('a logged-in user records the weighted draw in synced history', async ({ page }) => {
    const auth = new AuthPage(page);
    const history = new HistoryAside(page);
    const weighted = new WeightedPage(page);

    await mockBackend(page, user);

    await page.goto('/');
    await page.waitForURL('/');
    await auth.gotoLogin();
    await auth.login({ email: user.email, password: user.password });
    await page.waitForURL('/');

    await weighted.goto();
    await weighted.addEntry('Opción A', 3);
    await weighted.addEntry('Opción B', 1);
    await weighted.draw();
    expect(await weighted.winner()).not.toBeNull();

    expect(await history.entryCount()).toBe(1);
    expect(await history.latestSynced()).toBe(true);
  });
});
