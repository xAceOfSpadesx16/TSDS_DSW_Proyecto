// =============================================================================
// WeightedPage — Page Object del módulo Sorteo con Pesos (/weighted).
// =============================================================================

import type { Page } from '@playwright/test';

export class WeightedPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/weighted');
    await this.page.locator('#weighted-form').waitFor();
  }

  async addEntry(name: string, weight: number): Promise<void> {
    await this.page.locator('#weighted-name').fill(name);
    await this.page.locator('#weighted-weight').fill(String(weight));
    await this.page.getByRole('button', { name: '+ Agregar' }).click();
    await this.page
      .locator('#weighted-list > li')
      .filter({ hasText: name })
      .first()
      .waitFor();
  }

  async setAutoRemove(checked: boolean): Promise<void> {
    const box = this.page.locator('#weighted-auto-remove');
    if ((await box.isChecked()) !== checked) {
      await box.check();
    }
  }

  async entryCount(): Promise<number> {
    return this.page.locator('#weighted-list > li').count();
  }

  /** Nombres de los participantes cargados, en orden. */
  async entries(): Promise<string[]> {
    const names = await this.page
      .locator('#weighted-list > li > div > span.font-semibold')
      .allTextContents();
    return names.map((n) => n.trim());
  }

  async draw(): Promise<void> {
    await this.page.locator('#weighted-draw-btn').click();
    await this.page.locator('#weighted-result').waitFor();
  }

  async reset(): Promise<void> {
    await this.page.locator('#weighted-reset-btn').click();
  }

  async winner(): Promise<string | null> {
    const el = this.page.locator('#weighted-result > div.text-2xl').first();
    if (await el.count() === 0) return null;
    return el.textContent();
  }

  /** Probabilidad declarada del ganador, si está visible. */
  async probability(): Promise<string | null> {
    const el = this.page.locator('#weighted-result > div:last-child').first();
    if (await el.count() === 0) return null;
    return el.textContent();
  }
}
