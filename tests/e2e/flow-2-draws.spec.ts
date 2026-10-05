import { test, expect } from '@playwright/test';
import { mockBackend, makeUser } from '../helpers/api-mock';
import { AuthPage } from '../pages/auth-page';
import { HistoryAside } from '../pages/history-aside';
import { DicePage } from '../pages/dice-page';

const user = makeUser();

test.describe('Flow 2 — Anonymous vs authenticated draws', () => {
  test('a dice roll works anonymously and is recorded as local-only', async ({ page }) => {
    const history = new HistoryAside(page);
    const dice = new DicePage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await dice.goto();
    await dice.rollDice(6);

    const result = await dice.result();
    expect(result, 'dice result should be shown').not.toBeNull();
    const n = Number(result);
    expect(n, 'result should be within 1..6').toBeGreaterThanOrEqual(1);
    expect(n, 'result should be within 1..6').toBeLessThanOrEqual(6);

    // Anonymous user: no login required, but the operation is recorded locally.
    expect(await history.isEmpty()).toBe(false);
    expect(
      await history.latestLocal(),
      'anonymous draw must be flagged local-only',
    ).toBe(true);
  });

  test('an authenticated user sees the same draw synced to history', async ({ page }) => {
    const auth = new AuthPage(page);
    const history = new HistoryAside(page);
    const dice = new DicePage(page);

    await mockBackend(page, user);

    await page.goto('/');
    await page.waitForURL('/');
    await auth.gotoLogin();
    await auth.login({ email: user.email, password: user.password });
    await page.waitForURL('/');
    expect(await auth.isLoggedIn()).toBe(true);

    await dice.goto();
    await dice.rollDice(20);
    const result = await dice.result();
    expect(result, 'dice result should be shown').not.toBeNull();

    expect(
      await history.latestSynced(),
      'authenticated draw must be synced',
    ).toBe(true);
  });

  test('authenticated draws sync; new draws while anonymous stay local-only', async ({ page }) => {
    const auth = new AuthPage(page);
    const history = new HistoryAside(page);
    const dice = new DicePage(page);

    await mockBackend(page, user);

    await page.goto('/');
    await page.waitForURL('/');
    await auth.gotoLogin();
    await auth.login({ email: user.email, password: user.password });
    await page.waitForURL('/');

    // Authenticated draw: synced to the backend.
    await dice.goto();
    await dice.rollDice(6);
    await dice.result(); // espera a que la animación fije la entrada
    expect(await history.entryCount()).toBe(1);
    expect(await history.latestSynced()).toBe(true);

    // Log out and draw again: the new draw can't sync, so it stays local-only.
    // (El logout no redirige ni recarga la página: seguimos en /dice, así que
    // NO volvemos a navegar con page.goto() — eso recargaría y limpiaría el
    // store de historial en memoria.)
    await auth.logout();
    await dice.rollDice(4);
    await dice.result();

    expect(await history.entryCount()).toBe(2);
    expect(
      await history.latestLocal(),
      'the new anonymous draw must be local-only',
    ).toBe(true);
  });

  test('an empty history is neither synced nor local (no false positives)', async ({ page }) => {
    const history = new HistoryAside(page);
    const dice = new DicePage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await dice.goto();

    // Sin operaciones: el panel existe pero sin filas. Antes del fix,
    // latestSynced() devolvía `true` (falso positivo) porque count() de la
    // etiqueta da 0 cuando no hay fila.
    expect(await history.isEmpty()).toBe(true);
    expect(await history.latestSynced()).toBe(false);
    expect(await history.latestLocal()).toBe(false);
  });

  test('auditoría de red: un dado anónimo NO llama a /api/history', async ({
    page,
  }) => {
    const dice = new DicePage(page);
    let historyCalls = 0;
    // Se cuenta toda petición al endpoint de sincronización (local vs cloud).
    page.on('request', (req) => {
      if (req.url().includes('/api/history')) historyCalls++;
    });

    // Sin mockBackend: no hay backend. Un usuario anónimo no debe sincronizar.
    await page.goto('/');
    await page.waitForURL('/');
    await dice.goto();
    await dice.rollDice(6);
    await dice.result();

    expect(
      historyCalls,
      'un dado anónimo no debe disparar ninguna sincronización',
    ).toBe(0);
  });

  test('auditoría de red: un dado autenticado SINCRONIZA contra /api/history', async ({
    page,
  }) => {
    const auth = new AuthPage(page);
    const dice = new DicePage(page);
    mockBackend(page, user);

    let historyCalls = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/history')) historyCalls++;
    });

    await auth.gotoLogin();
    await auth.login({ email: user.email, password: user.password });
    await page.waitForURL('/');

    await dice.goto();
    await dice.rollDice(6);
    await dice.result();

    expect(
      historyCalls,
      'un dado autenticado debe sincronizar exactamente una vez',
    ).toBe(1);
  });
});
