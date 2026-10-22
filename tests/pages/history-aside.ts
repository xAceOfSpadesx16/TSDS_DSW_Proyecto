// =============================================================================
// HistoryAside — Page Object del panel lateral de historial.
// Reutilizado por todas las páginas de módulos.
// =============================================================================

import type { Page } from '@playwright/test';

export class HistoryAside {
  constructor(private readonly page: Page) {}

  /** Abre el disclosure del historial si está colapsado. */
  async open(): Promise<void> {
    const trigger = this.page.getByRole('button', { name: 'Mostrar historial' });
    if ((await trigger.count()) > 0) {
      await trigger.click();
    }
  }

  /** El panel aparece vacío hasta que hay una operación. */
  async isEmpty(): Promise<boolean> {
    await this.open();
    return (await this.page.getByText('Sin operaciones registradas.').count()) > 0;
  }

  async entryCount(): Promise<number> {
    await this.open();
    return this.page.locator('#history-list [data-history-entry]').count();
  }

  /** Busca una entrada por el texto de su descripción. */
  private entry(description: string) {
    return this.page
      .locator('#history-list [data-history-entry]')
      .filter({ hasText: description })
      .first();
  }

  /** La descripción de la entrada más reciente (la primera). */
  async latestDescription(): Promise<string | null> {
    await this.open();
    const first = this.page.locator('#history-list [data-history-entry]').first();
    if ((await first.count()) === 0) return null;
    return first.locator('span.text-sm').first().textContent();
  }

  /** `true` si la entrada está marcada como sincronizada (sin distintivo local). */
  async isSynced(description: string): Promise<boolean> {
    await this.open();
    const el = this.entry(description);
    // La fila debe existir: si no hay entrada, no puede estar sincronizada.
    // Sin esta verificación, una entrada inexistente devolvería `true`
    // (falso positivo, porque count() de la etiqueta da 0).
    if ((await el.count()) === 0) return false;
    return (
      (await el.locator('text="Guardado en este navegador"').count()) === 0
    );
  }

  /** `true` si la entrada sigue siendo solo local. */
  async isLocal(description: string): Promise<boolean> {
    const el = this.entry(description);
    // Sin fila: no puede ser local (evita un falso positivo por negación
    // de isSynced()).
    if ((await el.count()) === 0) return false;
    return !(await this.isSynced(description));
  }

  /** `true` si la entrada más reciente está sincronizada. */
  async latestSynced(): Promise<boolean> {
    await this.open();
    const first = this.page.locator('#history-list [data-history-entry]').first();
    if ((await first.count()) === 0) return false;
    return (
      (await first.locator('text="Guardado en este navegador"').count()) === 0
    );
  }

  /** `true` si la entrada más reciente sigue siendo solo local. */
  async latestLocal(): Promise<boolean> {
    await this.open();
    // Sin filas: no hay entrada, así que no puede ser local (evita un
    // falso positivo por negación de latestSynced()).
    if (
      (await this.page.locator('#history-list [data-history-entry]').count()) === 0
    ) {
      return false;
    }
    return !(await this.latestSynced());
  }

  async clear(): Promise<void> {
    await this.open();
    if ((await this.page.locator('#clear-history-btn').count()) > 0) {
      await this.page.locator('#clear-history-btn').click();
    }
  }
}
