import { test, expect } from '@playwright/test';

const DRAW_ROUTES = ['/dice', '/numbers', '/teams', '/weighted', '/roulette'];

test.describe('Layout', () => {
  test('todas las pantallas de sorteo comparten ancho y alineación del historial', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const widths: number[] = [];
    const historyBoxes: Array<{ x: number; width: number }> = [];

    for (const route of DRAW_ROUTES) {
      await page.goto(route);
      const section = page.locator('main section').first();
      const sectionBox = await section.boundingBox();
      expect(sectionBox, `${route} debe tener sección`).not.toBeNull();
      widths.push(sectionBox!.width);

      const history = page.locator('#history-aside');
      const historyBox = await history.boundingBox();
      expect(historyBox, `${route} debe tener historial`).not.toBeNull();
      historyBoxes.push({ x: historyBox!.x, width: historyBox!.width });
    }

    for (const width of widths) {
      expect(Math.abs(width - widths[0])).toBeLessThanOrEqual(1);
    }
    for (const box of historyBoxes) {
      expect(Math.abs(box.x - historyBoxes[0].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.width - historyBoxes[0].width)).toBeLessThanOrEqual(1);
    }
  });

  test('abrir las reglas avanzadas de equipos no cambia el ancho', async ({ page }) => {
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
});
