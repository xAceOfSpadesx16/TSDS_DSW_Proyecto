import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve(process.cwd(), '../docs/informe/auditoria');

const ROUTES = [
  { path: '/', slug: 'inicio' },
  { path: '/dice', slug: 'dice' },
  { path: '/numbers', slug: 'numbers' },
  { path: '/teams', slug: 'teams' },
  { path: '/weighted', slug: 'weighted' },
  { path: '/roulette', slug: 'roulette' },
  { path: '/login', slug: 'login' },
  { path: '/register', slug: 'register' },
  { path: '/ruta-inexistente', slug: '404' },
] as const;

const VIEWPORTS = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 667 },
] as const;

const STATES = ['invitado', 'logueado'] as const;

type AuditIssue = {
  type: string;
  target: string;
  detail: string;
};

const DEMO_USER = { email: 'demo1@thrive.test', password: 'demo12345' };

async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DEMO_USER.email);
  await page.getByLabel('Contraseña').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
  await page.waitForLoadState('networkidle');
}

async function openHistory(page: Page) {
  const toggle = page.locator('#history-toggle-btn');
  if ((await toggle.count()) === 0) {
    return;
  }
  if ((await toggle.getAttribute('aria-expanded')) === 'false') {
    await toggle.click();
  }
}

async function closeHistory(page: Page) {
  const toggle = page.locator('#history-toggle-btn');
  if (
    (await toggle.count()) > 0 &&
    (await toggle.getAttribute('aria-expanded')) === 'true'
  ) {
    await toggle.click();
  }
}

async function generateResult(page: Page, route: string) {
  switch (route) {
    case '/dice':
      await page.locator('#dice-modifier').fill('2');
      await page.locator('[data-sides="20"]').click();
      await expect(page.locator('#dice-total')).toBeVisible();
      break;
    case '/numbers':
      await page.locator('#generate-numbers-btn').click();
      await expect(page.locator('#numbers-result')).toBeVisible();
      break;
    case '/teams':
      await page
        .locator('#team-participants')
        .fill('Ana\nBruno\nCarla\nDiego\nElena\nFede\nGabi\nHugo');
      await page.locator('#generate-teams-btn').click();
      await expect(page.locator('#team-results')).toBeVisible();
      break;
    case '/weighted':
      for (const [name, weight] of [
        ['Ana', '1'],
        ['Beto', '2'],
        ['Cami', '3'],
        ['Diego', '4'],
      ]) {
        await page.locator('#weighted-name').fill(name);
        await page.locator('#weighted-weight').fill(weight);
        await page.locator('#weighted-form button[type="submit"]').click();
      }
      await page.locator('#weighted-draw-btn').click();
      await expect(page.locator('#weighted-result')).toBeVisible();
      break;
    case '/roulette':
      await page.locator('#roulette-spin-btn').click();
      await expect(page.locator('#roulette-result-overlay')).toBeVisible();
      await page.locator('#roulette-close-result').click();
      break;
    default:
      break;
  }
}

async function visit(
  page: Page,
  route: string,
  state: (typeof STATES)[number],
) {
  await page.goto(route);
  if (route === '/login' || route === '/register') {
    if (state === 'logueado') {
      await page.waitForURL('/');
    }
  }
  await page.waitForLoadState('networkidle');

  if (['/dice', '/numbers', '/teams', '/weighted', '/roulette'].includes(route)) {
    // El panel superpuesto se recuerda entre rutas: se cierra para operar
    // sobre el formulario y se vuelve a abrir para la captura.
    await closeHistory(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await generateResult(page, route);
    await openHistory(page);
    if (state === 'logueado') {
      await page
        .waitForFunction(
          () =>
            !Array.from(document.querySelectorAll('[data-history-entry]')).some(
              (entry) => entry.textContent?.includes('Guardado en este navegador'),
            ),
          undefined,
          { timeout: 5000 },
        )
        .catch(() => undefined);
    }
  }
}

async function auditPage(page: Page): Promise<AuditIssue[]> {
  return page.evaluate(() => {
    const issues: Array<{ type: string; target: string; detail: string }> = [];
    const push = (type: string, el: Element, detail: string) => {
      const id = el.id ? `#${el.id}` : '';
      const cls =
        typeof el.className === 'string' && el.className
          ? `.${el.className.split(/\s+/).slice(0, 3).join('.')}`
          : '';
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      issues.push({
        type,
        target: `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`,
        detail,
      });
    };

    const overlays = Array.from(
      document.querySelectorAll('dialog[open], #history-aside'),
    )
      .filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        const cs = getComputedStyle(node);
        return node.tagName === 'DIALOG' || cs.position === 'fixed';
      })
      .map((node) => node.getBoundingClientRect());

    const clippedByScroll = (el: Element): boolean => {
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const cs = getComputedStyle(parent);
        const scrollsY =
          cs.overflowY === 'auto' ||
          cs.overflowY === 'scroll' ||
          cs.overflowY === 'hidden';
        if (scrollsY && parent instanceof HTMLElement && parent.clientHeight > 0) {
          const container = parent.getBoundingClientRect();
          const own = el.getBoundingClientRect();
          const centerY = own.top + own.height / 2;
          if (centerY < container.top || centerY > container.bottom) {
            return true;
          }
        }
        parent = parent.parentElement;
      }
      return false;
    };

    const visible = (el: Element): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.closest('details:not([open])') && !el.closest('summary')) {
        return false;
      }
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (
        cs.display === 'none' ||
        cs.visibility === 'hidden' ||
        cs.opacity === '0' ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        clippedByScroll(el)
      ) {
        return false;
      }
      const fixed = cs.position === 'fixed' || cs.position === 'sticky';
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const covered =
        !fixed &&
        !el.closest('dialog[open], #history-aside') &&
        overlays.some(
          (overlay) =>
            centerX >= overlay.left &&
            centerX <= overlay.right &&
            centerY >= overlay.top &&
            centerY <= overlay.bottom,
        );
      return !covered;
    };

    const directText = (el: Element): string =>
      Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => (node.textContent ?? '').trim())
        .filter(Boolean)
        .join(' ');

    const overlayAncestor = (el: Element): Element | null => {
      const dialog = el.closest('dialog[open]');
      if (dialog) return dialog;

      const nav = el.closest('#app-nav');
      if (nav instanceof HTMLElement && getComputedStyle(nav).position !== 'static') {
        return nav;
      }

      const history = el.closest('#history-aside');
      if (history instanceof HTMLElement && getComputedStyle(history).position === 'fixed') {
        return history;
      }

      return null;
    };

    const all = Array.from(document.querySelectorAll('body *'));

    for (const el of all) {
      if (!visible(el)) continue;

      const text = directText(el);
      if (text && !el.closest('svg') && !el.closest('.sr-only')) {
        const cs = getComputedStyle(el);
        const scrollX = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
        const scrollY = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
        if (!scrollX && el.scrollWidth > el.clientWidth + 1) {
          push(
            'texto-cortado-x',
            el,
            `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
          );
        }
        if (!scrollY && el.scrollHeight > el.clientHeight + 2) {
          push(
            'texto-cortado-y',
            el,
            `scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`,
          );
        }
      }
    }

    for (const el of all) {
      if (!visible(el)) continue;
      if (!el.matches('button, a[href], input, select, textarea, summary')) {
        continue;
      }
      if (el.classList.contains('sr-only')) continue;
      let target: Element = el;
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
        target = el.closest('label') ?? el;
      }
      const rect = target.getBoundingClientRect();
      if (rect.width + 0.5 < 44 || rect.height + 0.5 < 44) {
        push(
          'objetivo-menor-44',
          el,
          `${Math.round(rect.width)}×${Math.round(rect.height)}`,
        );
      }
    }

    for (const el of all) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      if (el.matches('button, input[type="submit"], input[type="button"]')) {
        const bg = cs.backgroundColor;
        if (
          bg === 'rgb(239, 239, 239)' ||
          cs.borderTopStyle === 'outset' ||
          cs.borderTopStyle === 'inset'
        ) {
          push('boton-sin-estilo', el, `fondo ${bg}, borde ${cs.borderTopStyle}`);
        }
      }
      if (el.matches('a[href]')) {
        if (
          cs.color === 'rgb(0, 0, 238)' ||
          cs.color === 'rgb(0, 0, 255)' ||
          cs.color === 'rgb(85, 26, 139)'
        ) {
          push('enlace-sin-estilo', el, `color ${cs.color}`);
        }
      }
      if (directText(el)) {
        const font = cs.fontFamily.toLowerCase();
        const serif =
          /(^|,\s*)(serif|times new roman|times|georgia|garamond|palatino)\b/.test(
            font,
          ) && !font.includes('sans-serif');
        if (serif) {
          push('fuente-serif', el, cs.fontFamily);
        }
      }
    }

    const root = document.documentElement;
    if (root.scrollWidth > window.innerWidth + 1) {
      issues.push({
        type: 'scroll-horizontal',
        target: 'document',
        detail: `scrollWidth ${root.scrollWidth} > viewport ${window.innerWidth}`,
      });
    }

    const candidates = all.filter((el) => {
      if (!visible(el)) return false;
      if (el.closest('svg, script, style')) return false;
      if (el.classList.contains('sr-only')) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return false;
      const interactive = el.matches(
        'button, a[href], input, select, textarea, summary, [role="button"], aside[aria-label="Publicidad"]',
      );
      return interactive || directText(el).length > 0;
    });

    const boxes = candidates.map((el) => ({
      el,
      rect: el.getBoundingClientRect(),
      layer: overlayAncestor(el),
    }));

    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (a.layer !== b.layer) continue;
        if (a.layer !== null && a.layer !== b.layer) continue;
        if (a.layer && a.layer.contains(b.el) && b.layer && b.layer.contains(a.el)) {
          continue;
        }
        if (
          a.rect.left < b.rect.right &&
          b.rect.left < a.rect.right &&
          a.rect.top < b.rect.bottom &&
          b.rect.top < a.rect.bottom
        ) {
          push(
            'superposicion',
            a.el,
            `se cruza con ${b.el.tagName.toLowerCase()}${b.el.id ? `#${b.el.id}` : ''} "${(
              b.el.textContent ?? ''
            )
              .trim()
              .replace(/\s+/g, ' ')
              .slice(0, 30)}"`,
          );
        }
      }
    }

    return issues;
  });
}

test.describe('Auditoría visual', () => {
  test.beforeAll(() => {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  });

  for (const viewport of VIEWPORTS) {
    for (const state of STATES) {
      test(`${viewport.width}×${viewport.height} — ${state}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.emulateMedia({ reducedMotion: 'reduce' });

        if (state === 'logueado') {
          await loginAsDemo(page);
        }

        for (const route of ROUTES) {
          await visit(page, route.path, state);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.mouse.move(1, 1);
          await page.waitForTimeout(100);
          const issues = await auditPage(page);
          const screenshot = path.join(
            AUDIT_DIR,
            `${route.slug}-${viewport.width}x${viewport.height}-${state}.png`,
          );
          await page.screenshot({ path: screenshot, fullPage: true });

          expect(
            issues,
            `${route.path} @ ${viewport.width}×${viewport.height} (${state})\n${issues
              .map((issue) => `- ${issue.type}: ${issue.target} — ${issue.detail}`)
              .join('\n')}`,
          ).toEqual([]);
        }
      });
    }
  }
});
