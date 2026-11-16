import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Box = { x: number; y: number; width: number; height: number };

const VIEWPORTS = [
  { width: 2560, height: 1440, variant: 'tower-large', banners: 0 },
  { width: 1920, height: 1080, variant: 'tower-wide', banners: 0 },
  { width: 1600, height: 900, variant: 'tower-wide', banners: 0 },
  { width: 1440, height: 900, variant: 'tower', banners: 0 },
  { width: 1366, height: 768, variant: null, banners: 1 },
  { width: 1024, height: 768, variant: null, banners: 1 },
  { width: 390, height: 844, variant: null, banners: 1 },
  { width: 320, height: 667, variant: null, banners: 1 },
] as const;

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox();
  expect(value, 'el elemento debe tener caja').not.toBeNull();
  return value!;
}

function visibleAds(page: Page) {
  return page.locator('aside[aria-label="Publicidad"]:visible');
}

async function expectNoHorizontalScroll(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    blocking,
    blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n'),
  ).toEqual([]);
}

test.describe('Espacios publicitarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // La API se mockea para que el pie y el aviso no dependan del backend real.
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
  });

  for (const viewport of VIEWPORTS) {
    test(`variante y ubicación a ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/');
      await expect(page.locator('main')).toBeVisible();

      const ads = visibleAds(page);
      const count = await ads.count();
      expect(count).toBeGreaterThan(0);

      const variants = await ads.evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLElement).dataset.adVariant),
      );

      if (viewport.variant) {
        expect(variants.filter((v) => v === viewport.variant)).toHaveLength(2);
        for (const other of ['tower', 'tower-wide', 'tower-large']) {
          if (other !== viewport.variant) {
            expect(variants).not.toContain(other);
          }
        }
      } else if (viewport.width >= 1024) {
        expect(variants).toContain('leaderboard');
        expect(variants).not.toContain('tower');
        expect(variants).not.toContain('tower-wide');
        expect(variants).not.toContain('tower-large');
      } else {
        expect(variants).toContain('mobile-banner');
        expect(variants).not.toContain('leaderboard');
      }

      // El banner no convive con los laterales.
      const hasLateral = variants.some(
        (variant) =>
          variant === 'tower' ||
          variant === 'tower-wide' ||
          variant === 'tower-large',
      );
      const banner = page.locator(
        'aside[data-ad-variant="leaderboard"]:visible, aside[data-ad-variant="mobile-banner"]:visible',
      );
      if (hasLateral) {
        await expect(banner).toHaveCount(0);
      } else {
        await expect(banner).toHaveCount(viewport.banners);
      }

      await expectNoHorizontalScroll(page);

      // Los avisos no reciben foco.
      const focusable = page.locator(
        'aside[aria-label="Publicidad"] a, aside[aria-label="Publicidad"] button, aside[aria-label="Publicidad"] input, aside[aria-label="Publicidad"] select, aside[aria-label="Publicidad"] textarea, aside[aria-label="Publicidad"] [tabindex]',
      );
      await expect(focusable).toHaveCount(0);
    });
  }

  test('los laterales dejan 16 px al borde y al contenido', async ({ page }) => {
    const expectedWidths: Record<number, number> = {
      1440: 1136,
      1600: 1216,
      1920: 1440,
      2560: 1440,
    };
    for (const width of [1440, 1600, 1920, 2560]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto('/');
      await expect(page.locator('main')).toBeVisible();
      await settle(page);

      const main = await box(page.locator('main'));
      expect(Math.abs(main.width - expectedWidths[width]!)).toBeLessThanOrEqual(1);

      const ads = page.locator(
        'aside[data-ad-variant="tower"]:visible, aside[data-ad-variant="tower-wide"]:visible, aside[data-ad-variant="tower-large"]:visible',
      );
      await expect(ads).toHaveCount(2);

      for (let index = 0; index < 2; index++) {
        const ad = await box(ads.nth(index));
        const gapToViewport =
          index === 0 ? ad.x : width - (ad.x + ad.width);
        expect(gapToViewport).toBeGreaterThanOrEqual(16);

        const gapToContent =
          index === 0 ? main.x - (ad.x + ad.width) : ad.x - (main.x + main.width);
        expect(gapToContent).toBeGreaterThanOrEqual(16);
      }
      await expectNoHorizontalScroll(page);
    }
  });

  test('ningún espacio tapa contenido, header, pie ni el botón de historial', async ({
    page,
  }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/dice');
      await page.locator('[data-sides="6"]').click();
      await expect(page.locator('#dice-total')).toBeVisible();
      await settle(page);

      const ads = visibleAds(page);
      const adCount = await ads.count();
      expect(adCount).toBeGreaterThan(0);

      const protectedSelectors = [
        'header',
        'main h1',
        '#section-dice .panel',
        '#dice-reset-btn',
        'footer',
      ];
      for (let index = 0; index < adCount; index++) {
        const ad = await box(ads.nth(index));

        for (const selector of protectedSelectors) {
          const target = page.locator(selector).first();
          if ((await target.count()) === 0) continue;
          expect(
            overlaps(ad, await box(target)),
            `el espacio publicitario se superpone con ${selector} a ${viewport.width}px`,
          ).toBe(false);
        }

        const historyButton = page.locator('#history-toggle-btn');
        if (await historyButton.isVisible()) {
          await expect
            .poll(
              async () => overlaps(ad, await box(historyButton)),
              {
                message: `el espacio publicitario se superpone con el botón de historial a ${viewport.width}px`,
              },
            )
            .toBe(false);
        }
      }

      await expectNoHorizontalScroll(page);
    }
  });

  test('el rectángulo de la landing queda alineado con las tarjetas', async ({
    page,
  }) => {
    for (const width of [2560, 1920, 1600, 1440, 1366, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await settle(page);

      const rectangle = page.locator('aside[data-ad-variant="rectangle"]');
      await expect(rectangle).toBeVisible();

      const ad = await box(rectangle);
      expect(ad.width).toBe(300);
      expect(ad.height).toBe(250);

      const cards = page.locator('#modulos a');
      const lastCard = await box(cards.nth((await cards.count()) - 1));
      const adCenter = ad.y + ad.height / 2;
      const cardCenter = lastCard.y + lastCard.height / 2;

      expect(Math.abs(adCenter - cardCenter)).toBeLessThanOrEqual(2);
      expect(ad.x - (lastCard.x + lastCard.width)).toBeGreaterThanOrEqual(16);

      await expectNoHorizontalScroll(page);
    }
  });

  test('el pie y los laterales no se superponen al recorrer la página', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settle(page);

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    const footerBox = await box(footer);

    const ads = visibleAds(page);
    for (let index = 0; index < (await ads.count()); index++) {
      await expect
        .poll(async () => overlaps(await box(ads.nth(index)), footerBox))
        .toBe(false);
    }
  });

  test('no se muestran en login, registro ni 404', async ({ page }) => {
    for (const width of [1600, 1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/login', '/register', '/ruta-inexistente']) {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('aside[aria-label="Publicidad"]')).toHaveCount(
          0,
        );
      }
    }
  });

  test('no se carga ningún script externo de anuncios', async ({ page }) => {
    const externalScripts: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (
        url.includes('googlesyndication.com') ||
        url.includes('doubleclick.net') ||
        url.includes('adsbygoogle')
      ) {
        externalScripts.push(url);
      }
    });

    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(externalScripts).toEqual([]);
    const scripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src]')).map(
        (script) => (script as HTMLScriptElement).src,
      ),
    );
    expect(
      scripts.filter(
        (src) =>
          src.includes('googlesyndication') || src.includes('adsbygoogle'),
      ),
    ).toEqual([]);
  });

  for (const viewport of VIEWPORTS) {
    test(`axe sin violaciones graves con anuncios a ${viewport.width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/');
      await expect(page.locator('main')).toBeVisible();
      await expectAxeClean(page);
    });
  }
});
