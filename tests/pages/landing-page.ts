// =============================================================================
// LandingPage — Page Object de la portada (/).
// =============================================================================

import type { Page } from '@playwright/test';

export class LandingPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /** Tarjeta de un módulo en la portada. */
  moduleCard(module: 'teams' | 'weighted' | 'roulette' | 'dice') {
    return this.page.getByRole('link', { name: moduleLabel(module) });
  }

  async goToModule(
    module: 'teams' | 'weighted' | 'roulette' | 'dice',
  ): Promise<void> {
    await this.moduleCard(module).click();
    await this.page.waitForLoadState('networkidle');
  }

  async hasHeading(): Promise<boolean> {
    return (
      await this.page.getByRole('heading', { name: 'Thrive Randomizer', level: 1 }).count()
    ) > 0;
  }
}

function moduleLabel(module: 'teams' | 'weighted' | 'roulette' | 'dice'): string {
  switch (module) {
    case 'teams':
      return 'Generador de Equipos';
    case 'weighted':
      return 'Sorteo con Pesos';
    case 'roulette':
      return 'Ruleta de Decisiones';
    case 'dice':
      return 'Dados y Números';
  }
}
