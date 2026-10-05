// =============================================================================
// DicePage — Page Object del módulo Dados y Números (/dice).
// =============================================================================

import type { Page } from '@playwright/test';

export class DicePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/dice');
    await this.page.locator('#subtab-rpg').waitFor();
  }

  // ---- Dados RPG ----------------------------------------------------------
  async switchToRpg(): Promise<void> {
    await this.page.locator('#subtab-rpg').click();
  }

  async switchToNumbers(): Promise<void> {
    await this.page.locator('#subtab-numbers').click();
  }

  async rollDice(sides: number): Promise<void> {
    await this.page.locator(`[data-sides="${sides}"]`).click();
  }

  async setModifier(value: number): Promise<void> {
    await this.page.getByLabel('Modificador').fill(String(value));
  }

  /** Resultado crudo del dado (el output grande).
   * Espera a que termine la animación: `#dice-result` muestra `displayRoll`
   * durante el shake (siempre presente), y el resultado real se fija cuando
   * aparece `#dice-total`. */
  async result(): Promise<string | null> {
    await this.page.locator('#dice-total').waitFor();
    return this.page.locator('#dice-result').textContent();
  }

  /** Total con modificador, si aplica. */
  async total(): Promise<string | null> {
    const el = this.page.locator('#dice-total').first();
    if (await el.count() === 0) return null;
    return el.textContent();
  }

  // ---- Números ------------------------------------------------------------
  async generateNumbers(count: number, min: number, max: number): Promise<void> {
    await this.switchToNumbers();
    await this.page.getByLabel('Cantidad').fill(String(count));
    await this.page.getByLabel('Mínimo').fill(String(min));
    await this.page.getByLabel('Máximo').fill(String(max));
    await this.page.getByRole('button', { name: 'Generar' }).click();
  }

  async numbersResult(): Promise<string | null> {
    const el = this.page.locator('#number-gen-result').first();
    if (await el.count() === 0) return null;
    return el.textContent();
  }
}
