// =============================================================================
// RoulettePage — Page Object del módulo Ruleta (/roulette).
// =============================================================================

import type { Page } from '@playwright/test';

export class RoulettePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/roulette');
    await this.page.locator('#roulette-spin-btn').waitFor();
  }

  async addOption(label: string, color = '#6c5ce7'): Promise<void> {
    await this.page.locator('#roulette-label').fill(label);
    if (color) {
      await this.page.locator('#roulette-color').fill(color);
    }
    await this.page.getByRole('button', { name: 'Agregar opción' }).click();
    await this.page
      .locator('#roulette-options-list li')
      .filter({ hasText: label })
      .first()
      .waitFor();
  }

  async removeOption(label: string): Promise<void> {
    await this.page
      .getByRole('button', { name: `Quitar opción ${label}` })
      .click();
  }

  async optionCount(): Promise<number> {
    return this.page.locator('#roulette-options-list li').count();
  }

  /** Elimina todas las opciones (la ruleta arranca con "Sí"/"No"). */
  async clear(): Promise<void> {
    while ((await this.optionCount()) > 0) {
      await this.page
        .locator('#roulette-options-list li')
        .first()
        .locator('button')
        .click();
    }
  }

  async isSpinDisabled(): Promise<boolean> {
    return await this.page.locator('#roulette-spin-btn').isDisabled();
  }

  /** Gira la ruleta y espera a que aparezca el modal de ganador. */
  async spin(): Promise<void> {
    await this.page.locator('#roulette-spin-btn').click();
    await this.page.locator('#roulette-result-text').waitFor();
  }

  async winner(): Promise<string | null> {
    return this.page.locator('#roulette-result-text').textContent();
  }

  async closeResult(): Promise<void> {
    if (await this.page.locator('#roulette-close-result').count() > 0) {
      await this.page.locator('#roulette-close-result').click();
    }
  }

  async hasResultDialog(): Promise<boolean> {
    return (await this.page.locator('#roulette-result-overlay[open]').count()) > 0;
  }
}
