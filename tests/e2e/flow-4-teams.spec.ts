import { test, expect } from '@playwright/test';
import { mockBackend, makeUser } from '../helpers/api-mock';
import { AuthPage } from '../pages/auth-page';
import { HistoryAside } from '../pages/history-aside';
import { TeamsPage } from '../pages/teams-page';

const user = makeUser();

test.describe('Flow 4 — Teams with exclusions', () => {
  test('generates balanced teams splitting excluded members', async ({ page }) => {
    const teams = new TeamsPage(page);

    await page.goto('/');
    await page.waitForURL('/');
    await teams.goto();

    await teams.setParticipants([
      'Ana',
      'Ben',
      'Cleo',
      'Dan',
      'Ela',
      'Finn',
      'Gus',
      'Hana',
    ]);
    await teams.setMode('count');
    await teams.setValue(2);
    await teams.addExclusion('Ana', 'Ben');

    await teams.generate();
    expect(await teams.teamCount()).toBe(2);

    const members = await teams.teamsText();
    expect(members.length).toBe(2);
    // Every participant appears exactly once across the teams.
    const all = members.flat();
    expect(all.sort()).toEqual(
      ['Ana', 'Ben', 'Cleo', 'Dan', 'Ela', 'Finn', 'Gus', 'Hana'].sort(),
    );
    // The excluded pair must end up on different teams.
    expect(await teams.separated('Ana', 'Ben')).toBe(true);
  });

  test('a logged-in user records the team generation in synced history', async ({ page }) => {
    const auth = new AuthPage(page);
    const history = new HistoryAside(page);
    const teams = new TeamsPage(page);

    await mockBackend(page, user);

    await page.goto('/');
    await page.waitForURL('/');
    await auth.gotoLogin();
    await auth.login({ email: user.email, password: user.password });
    await page.waitForURL('/');

    await teams.goto();
    await teams.setParticipants(['Ana', 'Ben', 'Cleo', 'Dan']);
    await teams.setMode('size');
    await teams.setValue(2);
    await teams.generate();
    expect(await teams.teamCount()).toBeGreaterThan(0);

    expect(await history.entryCount()).toBe(1);
    expect(await history.latestSynced()).toBe(true);
  });
});
