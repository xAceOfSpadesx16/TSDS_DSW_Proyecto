import { test, expect, type Page } from '@playwright/test';

const ACCENT = 'rgb(35, 91, 85)';
const OLD_COBALT = ['rgb(31, 79, 181)', 'rgb(23, 62, 143)', 'rgb(16, 46, 107)'];

async function expectNoCobalt(page: Page) {
  const found = await page.evaluate((banned) => {
    const hits: string[] = [];
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const styles = getComputedStyle(element);
      const values = [
        styles.color,
        styles.backgroundColor,
        styles.borderTopColor,
        styles.borderRightColor,
        styles.borderBottomColor,
        styles.borderLeftColor,
        styles.outlineColor,
        styles.boxShadow,
      ];
      if (values.some((value) => banned.some((color) => value.includes(color)))) {
        hits.push(`${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`);
      }
    }
    return hits;
  }, OLD_COBALT);
  expect(found).toEqual([]);
}

test.describe('Acento y botones neumórficos', () => {
  test('el token de acción es verde petróleo en todas las pantallas', async ({
    page,
  }) => {
    await page.goto('/');
    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-action')
        .trim(),
    );
    expect(token).toBe('#235b55');

    for (const route of ['/', '/dice', '/weighted', '/roulette']) {
      await page.goto(route);
      await expectNoCobalt(page);
    }
  });

  test('el botón principal conserva relieve y el secundario se hunde al activarse', async ({
    page,
  }) => {
    await page.goto('/numbers');

    const primary = page.locator('#generate-numbers-btn');
    const primaryStyles = await primary.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { background: styles.backgroundColor, shadow: styles.boxShadow };
    });
    expect(primaryStyles.background).toBe(ACCENT);
    expect(primaryStyles.shadow).not.toBe('none');

    const secondary = page.locator('#numbers-reset-btn');
    const secondaryShadow = await secondary.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    );
    expect(secondaryShadow).not.toBe('none');

    const activeNav = page.locator('nav a[aria-current="page"]').first();
    const activeStyles = await activeNav.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        background: styles.backgroundColor,
        color: styles.color,
        border: styles.borderTopColor,
        shadow: styles.boxShadow,
      };
    });
    expect(activeStyles.background).not.toBe(ACCENT);
    expect(activeStyles.color).toBe(ACCENT);
    expect(activeStyles.border).toBe(ACCENT);
    expect(activeStyles.shadow).toContain('inset');

    await page.goto('/dice');
    const selectedDice = page.locator('[data-sides="6"]');
    await selectedDice.click();
    const diceStyles = () =>
      selectedDice.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          border: styles.borderTopColor,
          color: styles.color,
          shadow: styles.boxShadow,
          pressed: element.getAttribute('aria-pressed'),
        };
      });
    await expect.poll(async () => (await diceStyles()).border).toBe(ACCENT);
    const settled = await diceStyles();
    expect(settled.pressed).toBe('true');
    expect(settled.color).toBe(ACCENT);
    expect(settled.shadow).toContain('inset');
  });

  test('el foco sigue siendo ámbar y distinto del acento', async ({ page }) => {
    await page.goto('/dice');
    const reset = page.locator('#dice-reset-btn');
    await reset.focus();
    const styles = await reset.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        color: computed.outlineColor,
        style: computed.outlineStyle,
        width: computed.outlineWidth,
      };
    });
    expect(styles.color).toBe('rgb(180, 83, 9)');
    expect(styles.style).toBe('solid');
    expect(styles.width).toBe('2px');
    expect(styles.color).not.toBe(ACCENT);
  });
});
