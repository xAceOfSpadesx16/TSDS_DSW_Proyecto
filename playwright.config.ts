import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para los E2E de Thrive Randomizer.
 *
 * La app se sirve con el dev server de Vite (npm run dev) en :5173.
 * Los tests NO dependen de un backend vivo: cada spec intercepta las
 * llamadas a la API con route.fulfill (ver tests/e2e/*.spec.ts), lo que
 * los hace autosuficientes y deterministas (principio 2.2 del plan).
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Cada test corre con su propio storageState para mantener el aislamiento.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Levanta el dev server de Vite antes de correr los tests.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
