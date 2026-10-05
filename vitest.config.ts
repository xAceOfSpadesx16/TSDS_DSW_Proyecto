// =============================================================================
// Configuración de Vitest.
//
// Unit tests de lógica pura (mathUtils + estrategias + repositorios + stores)
// se corren en el entorno `node`. Los tests de componentes (`*.test.tsx`)
// declaran `// @vitest-environment jsdom` al inicio del archivo para renderizar
// el DOM de React sin mezclarlo con el resto de la suite.
// =============================================================================

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Unit + component tests. Los specs E2E (tests/e2e/*.spec.ts) los corre
    // Playwright, no Vitest — evitar que se mezclen.
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/mathUtils.ts',
        'src/strategies/*.ts',
        'src/repositories/*.ts',
        'src/store/*.ts',
        'src/components/*.ts',
        'src/components/*.tsx',
        'src/pages/*.tsx',
        'src/router.tsx',
      ],
      thresholds: {
        // Umbrales de aprobación de la sección 7 del plan.
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
