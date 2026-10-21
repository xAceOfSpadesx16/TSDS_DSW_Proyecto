import { test, expect } from '@playwright/test';

test.describe('Alto contraste', () => {
  test('prefers-contrast: more reemplaza sombras por bordes sólidos', async ({
    page,
  }) => {
    await page.emulateMedia({ contrast: 'more' });
    await page.goto('/dice');

    const card = page.locator('#section-dice > div').first();
    await expect(card).toBeVisible();

    const cardStyles = await card.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        shadow: styles.boxShadow,
        borderStyle: styles.borderTopStyle,
        borderColor: styles.borderTopColor,
      };
    });
    expect(cardStyles.shadow).toBe('none');
    expect(cardStyles.borderStyle).toBe('solid');
    expect(cardStyles.borderColor).toBe('rgb(34, 31, 26)');

    const input = page.locator('#dice-modifier');
    const inputStyles = await input.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        shadow: styles.boxShadow,
        borderWidth: styles.borderTopWidth,
        borderStyle: styles.borderTopStyle,
        borderColor: styles.borderTopColor,
      };
    });
    expect(inputStyles.shadow).toBe('none');
    expect(inputStyles.borderWidth).toBe('2px');
    expect(inputStyles.borderStyle).toBe('solid');
    expect(inputStyles.borderColor).toBe('rgb(34, 31, 26)');

    await input.focus();
    const focusedInputOutline = await input.evaluate((element) =>
      getComputedStyle(element).outlineWidth,
    );
    expect(focusedInputOutline).toBe('3px');

    const resetButton = page.locator('#dice-reset-btn');
    await resetButton.focus();
    const focusedButtonOutline = await resetButton.evaluate((element) =>
      getComputedStyle(element).outlineWidth,
    );
    expect(focusedButtonOutline).toBe('3px');

    const loginLink = page.getByRole('link', { name: 'Entrar' }).first();
    await loginLink.focus();
    const focusedLinkOutline = await loginLink.evaluate((element) =>
      getComputedStyle(element).outlineWidth,
    );
    expect(focusedLinkOutline).toBe('3px');
  });
});
