// =============================================================================
// TeamsPage — Page Object del módulo Generador de Equipos (/teams).
// =============================================================================

import type { Page } from '@playwright/test';

export type TeamsMode = 'count' | 'size';

export class TeamsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/teams');
    await this.page.locator('#team-form').waitFor();
  }

  async setParticipants(names: string[]): Promise<void> {
    await this.page.locator('#team-participants').fill(names.join('\n'));
  }

  async setMode(mode: TeamsMode): Promise<void> {
    const id = mode === 'count' ? '#mode-group-count' : '#mode-group-size';
    await this.page.locator(id).click();
  }

  async setValue(value: number): Promise<void> {
    // El label cambia según el modo ('Cantidad de grupos' / 'Tamaño de grupo'),
    // pero el input conserva su id.
    await this.page.locator('#team-value').fill(String(value));
  }

  /** Abre el acordeón de reglas avanzadas (exclusiones) si está cerrado. */
  async openAdvancedRules(): Promise<void> {
    const details = this.page.locator('details').first();
    if (!(await details.getAttribute('open'))) {
      await this.page.getByText('Reglas avanzadas (exclusiones)').click();
    }
  }

  async addExclusion(a: string, b: string): Promise<void> {
    await this.openAdvancedRules();
    await this.page.locator('#exclusion-a').fill(a);
    await this.page.locator('#exclusion-b').fill(b);
    // Los inputs son controlados por React: el estado se commite de forma
    // asíncrona. En vez de un timeout estático, esperamos reactivamente a que
    // los valores estén commiteados (polling) antes del submit.
    await this.page.waitForFunction(
      ({ a, b }) => {
        const elA = document.querySelector<HTMLInputElement>('#exclusion-a');
        const elB = document.querySelector<HTMLInputElement>('#exclusion-b');
        return !!elA && !!elB && elA.value === a && elB.value === b;
      },
      { a, b },
    );
    await this.page.locator('#add-exclusion-btn').click();
    await this.page
      .locator('#exclusion-list li')
      .filter({ hasText: `${a} ↔ ${b}` })
      .first()
      .waitFor();
  }

  async removeExclusion(a: string, b: string): Promise<void> {
    await this.page
      .getByRole('button', { name: `Quitar exclusión ${a} ${b}` })
      .click();
  }

  async generate(): Promise<void> {
    await this.page.locator('#generate-teams-btn').click();
    await this.page.locator('#team-results').waitFor();
  }

  async teamCount(): Promise<number> {
    return this.page.locator('#team-results > div').count();
  }

  /** Devuelve el texto de las integrantes de cada equipo (orden de aparición). */
  async teamsText(): Promise<Array<string[]>> {
    const cards = this.page.locator('#team-results > div');
    const count = await cards.count();
    const result: Array<string[]> = [];
    for (let i = 0; i < count; i++) {
      const members = await cards.nth(i)
        .locator('li')
        .allTextContents();
      result.push(members.map((m) => m.trim()));
    }
    return result;
  }

  /** `true` si `participant` está en algún equipo. */
  async participantInTeams(participant: string): Promise<boolean> {
    const teams = await this.teamsText();
    return teams.some((members) => members.includes(participant));
  }

  /** `true` si `a` y `b` quedan en equipos distintos (o al menos uno no está). */
  async separated(a: string, b: string): Promise<boolean> {
    const teams = await this.teamsText();
    const teamA = teams.findIndex((members) => members.includes(a));
    const teamB = teams.findIndex((members) => members.includes(b));
    if (teamA === -1 || teamB === -1) return false;
    return teamA !== teamB;
  }
}
