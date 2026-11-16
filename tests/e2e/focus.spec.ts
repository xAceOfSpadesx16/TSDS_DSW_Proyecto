import { test, expect } from '@playwright/test';

test.describe('Foco visible', () => {
  test('el h1 enfocado al navegar no dibuja contorno y un control sí', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Dados', exact: true }).click();
    await expect(page).toHaveURL(/\/dice$/);

    const heading = page.locator('main h1');
    await expect(heading).toBeFocused();
    const headingOutline = await heading.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { style: styles.outlineStyle, width: styles.outlineWidth };
    });
    expect(headingOutline.style).toBe('none');

    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    const controlOutline = await focused.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { style: styles.outlineStyle, width: styles.outlineWidth };
    });
    expect(controlOutline.style).toBe('solid');
    expect(controlOutline.width).toBe('2px');
  });
});
