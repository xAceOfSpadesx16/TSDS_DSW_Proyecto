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

      await page.locator('#history-toggle-btn').click();
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

  test('el número del dado usa la misma familia tipográfica en todos los anchos', async ({
    page,
  }) => {
    const families: string[] = [];
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/dice');
      const family = await page.locator('#dice-result').evaluate(
        (element) => getComputedStyle(element).fontFamily,
      );
      expect(family.toLowerCase()).toContain('bricolage');
      expect(family.toLowerCase()).not.toContain('mono');
      families.push(family);

      await page.locator('[data-sides="6"]').click();
      await expect(page.locator('#dice-total')).toBeVisible();
      const familyAfterRoll = await page.locator('#dice-result').evaluate(
        (element) => getComputedStyle(element).fontFamily,
      );
      expect(familyAfterRoll).toBe(family);
      families.push(familyAfterRoll);
    }
    expect(new Set(families).size).toBe(1);
  });

  test('en mobile el botón Historial no tapa el texto del pie', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/legal/disclaimer', (route) =>
      route.fulfill({
        json: {
          title: 'Aviso legal',
          version: '1.0.0',
          sections: [{ heading: 'Uso', body: 'Herramienta recreativa.' }],
        },
      }),
    );
    await page.route('**/api/health', (route) =>
      route.fulfill({
        json: {
          status: 'ok',
          service: 'Thrive Randomizer',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      }),
    );
    await page.goto('/weighted');
    await page.locator('#weighted-name').fill('Ana');
    await page.locator('#weighted-form button[type="submit"]').click();
    await page.locator('#weighted-draw-btn').click();
    await page.locator('#weighted-result').waitFor();
    await expect(
      page.locator('#legal-disclaimer summary'),
    ).toBeVisible();

    const layout = await page.evaluate(() => {
      const button = document
        .querySelector('#history-toggle-btn')!
        .getBoundingClientRect();
      const summary = document
        .querySelector('#legal-disclaimer summary')!
        .getBoundingClientRect();
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      return {
        buttonTop: button.top,
        buttonBottom: button.bottom,
        summaryBottomAtBottom:
          summary.bottom + window.scrollY - maxScroll,
        maxScroll,
        viewport: window.innerHeight,
      };
    });

    expect(layout.maxScroll).toBeGreaterThan(0);
    expect(layout.buttonTop).toBeGreaterThanOrEqual(
      layout.summaryBottomAtBottom + 8,
    );
    expect(layout.buttonBottom).toBeLessThanOrEqual(layout.viewport - 8);
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

  test('en Dados las fichas de tirada usan el relleno de acento primario', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dice');
    const die = page.locator('[data-sides="20"]');

    await expect(die).toHaveClass(/bg-action/);
    await expect(die).not.toHaveClass(/bg-surface-sunken/);

    await die.click();
    await expect(page.locator('#dice-total')).toBeVisible();
    await expect(die).toHaveClass(/bg-action-active/);
    await expect(die).not.toHaveClass(/bg-surface-sunken/);
  });

  test('en Ponderado los inputs Nombre y Peso comparten la línea superior a 1440 px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/weighted');
    await page.evaluate(() => document.fonts.ready);

    const name = await box(page.locator('#weighted-name'));
    const weight = await box(page.locator('#weighted-weight'));
    const nameLabel = await box(page.locator('label[for="weighted-name"]'));
    const weightLabel = await box(page.locator('label[for="weighted-weight"]'));
    const add = await box(page.getByRole('button', { name: '+ Agregar' }));

    expect(Math.abs(name.y - weight.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(nameLabel.y - weightLabel.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(add.y - name.y)).toBeLessThanOrEqual(2);
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
