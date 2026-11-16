import { test, expect, type Locator } from '@playwright/test';

const DRAW_ROUTES = ['/dice', '/numbers', '/teams', '/weighted', '/roulette'];

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value, 'el elemento debe tener caja').not.toBeNull();
  return value!;
}

function expectSameBox(
  before: Awaited<ReturnType<typeof box>>,
  after: Awaited<ReturnType<typeof box>>,
  tolerance = 1,
) {
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(tolerance);
}

test.describe('Layout fluido', () => {
  test('las cinco pantallas de sorteo comparten posición y ancho del área de trabajo', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const boxes: Array<{ x: number; width: number }> = [];

    for (const route of DRAW_ROUTES) {
      await page.goto(route);
      const main = await box(page.locator('main.workspace'));
      boxes.push({ x: main.x, width: main.width });
    }

    for (const item of boxes) {
      expect(Math.abs(item.x - boxes[0].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(item.width - boxes[0].width)).toBeLessThanOrEqual(1);
    }
  });

  test('abrir y cerrar el historial no mueve ni cambia el ancho del contenido', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/dice');

      const section = page.locator('#section-dice');
      const main = page.locator('main.workspace');
      const resetScroll = () =>
        page.evaluate(() => window.scrollTo(0, 0));

      await resetScroll();
      const before = await box(section);
      const beforeMain = await box(main);

      await page.locator('#history-toggle-btn').click();
      await expect(page.locator('#history-aside')).toBeVisible();
      await resetScroll();
      const after = await box(section);
      const afterMain = await box(main);
      expectSameBox(before, after);
      expectSameBox(beforeMain, afterMain);

      await page.locator('#history-close-btn').click();
      await expect(page.locator('#history-aside')).toHaveCount(0);
      await resetScroll();
      const afterClose = await box(section);
      expectSameBox(before, afterClose);
    }
  });

  test('el foco entra al panel al abrir, Escape lo cierra y vuelve al botón', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dice');

    const toggle = page.locator('#history-toggle-btn');
    await toggle.click();
    const panel = page.locator('#history-aside');
    await expect(panel).toBeVisible();
    await expect(page.locator('#history-panel-title')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test('en mobile el botón Historial no tapa el texto del pie', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/weighted');
    await page.locator('#weighted-name').fill('Ana');
    await page.locator('#weighted-form button[type="submit"]').click();
    await page.locator('#weighted-draw-btn').click();
    await page.locator('#weighted-result').waitFor();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const button = await box(page.locator('#history-toggle-btn'));
    const summary = await box(
      page.locator('#legal-disclaimer summary'),
    );
    expect(button.y).toBeGreaterThanOrEqual(summary.y + summary.height + 8);
    expect(button.y + button.height).toBeLessThanOrEqual(844 - 8);
  });

  test('una columna debajo de 1280 px y dos columnas desde 1280 px', async ({
    page,
  }) => {
    for (const [width, columns] of [
      [1024, 1],
      [1279, 1],
      [1280, 2],
      [1440, 2],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/teams');
      const count = await page
        .locator('#section-teams')
        .evaluate(
          (element) =>
            getComputedStyle(element)
              .gridTemplateColumns.split(/\s+/)
              .filter(Boolean).length,
        );
      expect(count, `columnas a ${width}px`).toBe(columns);
    }
  });

  test('a 1920 y 2560 px el espacio vacío a cada lado del área de trabajo no supera el 10 %', async ({
    page,
  }) => {
    for (const width of [1920, 2560]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/dice');
      await page.evaluate(() => document.fonts.ready);

      const main = await box(page.locator('main.workspace'));
      const leftAd = await box(
        page.locator('[data-ad-rail="left"] aside:visible'),
      );
      const rightAd = await box(
        page.locator('[data-ad-rail="right"] aside:visible'),
      );

      const leftEmpty = main.x - (leftAd.x + leftAd.width) - 16;
      const rightEmpty = rightAd.x - (main.x + main.width) - 16;
      const limit = width * 0.1;

      expect(leftEmpty, `espacio izquierdo a ${width}px`).toBeLessThanOrEqual(
        limit,
      );
      expect(rightEmpty, `espacio derecho a ${width}px`).toBeLessThanOrEqual(
        limit,
      );
      expect(leftEmpty).toBeGreaterThanOrEqual(0);
      expect(rightEmpty).toBeGreaterThanOrEqual(0);
    }
  });

  test('el panel abierto queda por encima del lateral derecho sin moverlo', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/dice');
    await page.evaluate(() => document.fonts.ready);

    const rail = page.locator('[data-ad-rail="right"] aside:visible');
    const railBefore = await box(rail);
    await page.locator('#history-toggle-btn').click();
    const panel = page.locator('#history-aside');
    await expect(panel).toBeVisible();
    const railAfter = await box(rail);
    expect(Math.abs(railAfter.x - railBefore.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(railAfter.y - railBefore.y)).toBeLessThanOrEqual(1);

    const panelBox = await box(panel);
    const x = Math.max(railAfter.x, panelBox.x) + 4;
    const y = railAfter.y + 4;
    const onTop = await page.evaluate(
      ({ px, py }) =>
        document
          .elementFromPoint(px, py)
          ?.closest('#history-aside') !== null,
      { px: x, py: y },
    );
    expect(onTop).toBe(true);
  });

  test('los campos no se estiran más de 60 caracteres en pantallas grandes', async ({
    page,
  }) => {
    for (const width of [1920, 2560]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/dice');
      const modifier = await box(page.locator('#dice-modifier'));
      expect(modifier.width, `modificador a ${width}px`).toBeLessThanOrEqual(640);

      await page.goto('/teams');
      const participants = await box(page.locator('#team-participants'));
      expect(
        participants.width,
        `participantes a ${width}px`,
      ).toBeLessThanOrEqual(640);
    }
  });

  test('abrir las reglas avanzadas de equipos no cambia el ancho', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/teams');

    const section = page.locator('#section-teams');
    const before = await section.boundingBox();
    expect(before).not.toBeNull();

    await page.getByText('Reglas avanzadas (exclusiones)').click();
    const after = await section.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
  });

  test('la landing tiene cinco módulos y la última tarjeta no queda huérfana en tablet', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/');

    const cta = page.getByRole('link', { name: 'Empezar a sortear' });
    await expect(cta).toHaveAttribute('href', '#modulos');
    await expect(cta).toBeVisible();

    const cards = page.locator('#modulos > a');
    await expect(cards).toHaveCount(5);
    const first = await cards.first().boundingBox();
    const last = await cards.last().boundingBox();
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();
    expect(last!.width).toBeGreaterThan(first!.width * 1.5);
  });

  test('la grilla de la landing usa cuatro columnas sin huecos a 2560 px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/');

    const columns = await page
      .locator('#modulos')
      .evaluate(
        (element) =>
          getComputedStyle(element)
            .gridTemplateColumns.split(/\s+/)
            .filter(Boolean).length,
      );
    expect(columns).toBe(4);

    const cards = page.locator('#modulos > a');
    const ad = page.locator('aside[data-ad-variant="rectangle"]');
    await expect(ad).toBeVisible();

    const lastCard = await box(cards.nth((await cards.count()) - 1));
    const adBox = await box(ad);
    const adCenter = adBox.y + adBox.height / 2;
    const cardCenter = lastCard.y + lastCard.height / 2;
    expect(Math.abs(adCenter - cardCenter)).toBeLessThanOrEqual(2);
  });
});
