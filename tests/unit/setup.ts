// Setup global para los tests de Vitest.
//
// Extiende `expect` con los matchers de `@testing-library/jest-dom`
// (toBeInTheDocument, toBeVisible, etc.). Es inocuo en el entorno `node`:
// solo registra los matchers y nunca se invocan en pruebas sin DOM.
import '@testing-library/jest-dom/vitest';
