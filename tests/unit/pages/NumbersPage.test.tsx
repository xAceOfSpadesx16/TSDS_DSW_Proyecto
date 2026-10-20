// @vitest-environment jsdom
// =============================================================================
// NumbersPage (/numbers) — sigue el patrón de DicePage.test.tsx:
// user-event + labels semánticos, y el store del historial como fuente de
// verdad para verificar el registro del sorteo.
// =============================================================================

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NumbersPage } from '../../../src/pages/NumbersPage';
import { useHistoryStore } from '../../../src/store/historyStore';
import { useAuthStore } from '../../../src/store/authStore';
import { createUserEvent, fillByLabel } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';

const resetHistory = () =>
  useHistoryStore.setState({ entries: [], currentPage: 1, lastPage: 1, error: null });

function renderNumbers() {
  render(<NumbersPage />);
}

const generate = () => {
  screen.getByRole('button', { name: 'Generar' }).click();
};

const resultNumbers = () =>
  document
    .querySelector('#numbers-result')!
    .textContent!.trim()
    .split(',')
    .map((n) => Number(n.trim()));

describe('NumbersPage — formulario', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    renderNumbers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renderiza cantidad, mínimo, máximo y el toggle de unicidad', () => {
    expect(screen.getByLabelText('Cantidad')).toBeInTheDocument();
    expect(screen.getByLabelText('Mínimo')).toBeInTheDocument();
    expect(screen.getByLabelText('Máximo')).toBeInTheDocument();
    expect(screen.getByLabelText('Sin repetición')).toBeChecked();
  });

  it('genera la cantidad pedida dentro del rango y lo registra en el historial', async () => {
    const user = createUserEvent();
    await fillByLabel(user, 'Cantidad', '5');
    await fillByLabel(user, 'Mínimo', '1');
    await fillByLabel(user, 'Máximo', '50');
    generate();

    await waitFor(() => expect(document.querySelector('#numbers-result')).toBeInTheDocument());

    const parsed = resultNumbers();
    expect(parsed).toHaveLength(5);
    for (const n of parsed) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(50);
    }

    const entries = useHistoryStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].module).toBe('numbers');
    expect(entries[0].description).toBe('5 números [1-50] (únicos)');
    expect(entries[0].synced).toBe(false);
  });

  it('borrar el campo y tipear "5" deja 5, sin concatenar con el mínimo', async () => {
    const user = createUserEvent();
    const input = screen.getByLabelText('Cantidad');

    await user.clear(input);
    // Mientras se edita el campo puede quedar vacío: no salta al mínimo.
    expect(input).toHaveValue(null);

    await user.type(input, '5');
    // El bug anterior: el clear dejaba "1" y al tipear quedaba "15".
    expect(input).toHaveValue(5);
  });

  it('el mínimo se aplica al salir del campo', async () => {
    const user = createUserEvent();
    const input = screen.getByLabelText('Cantidad');

    await user.clear(input);
    await user.type(input, '0');
    // Durante la edición el 0 se acepta (el clamp no está en onChange).
    expect(input).toHaveValue(0);

    await user.tab();
    // Al salir, el mínimo entra.
    expect(input).toHaveValue(1);
  });

  it('el mínimo se aplica al enviar cuando el campo quedó vacío', async () => {
    const user = createUserEvent();
    const input = screen.getByLabelText('Cantidad');

    await user.clear(input);
    generate();

    await waitFor(() => expect(document.querySelector('#numbers-result')).toBeInTheDocument());
    // El campo se rellenó con el mínimo y el sorteo salió con 1 número.
    expect(input).toHaveValue(1);
    expect(resultNumbers()).toHaveLength(1);
  });

  it('sin unicidad puede repetir valores y lo indica en la descripción', async () => {
    const user = createUserEvent();
    await fillByLabel(user, 'Cantidad', '5');
    await fillByLabel(user, 'Mínimo', '1');
    await fillByLabel(user, 'Máximo', '2');
    await user.click(screen.getByLabelText('Sin repetición'));
    generate();

    await waitFor(() => expect(document.querySelector('#numbers-result')).toBeInTheDocument());

    const entries = useHistoryStore.getState().entries;
    expect(entries[0].description).toBe('5 números [1-2] (con repetición)');
  });

  it('rechaza pedir más números únicos de los que caben en el rango', async () => {
    const user = createUserEvent();
    await fillByLabel(user, 'Cantidad', '10');
    await fillByLabel(user, 'Mínimo', '1');
    await fillByLabel(user, 'Máximo', '5');
    generate();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Pedís 10 números únicos pero el rango 1-5 solo tiene 5.');
    expect(document.querySelector('#numbers-result')).not.toBeInTheDocument();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('rechaza un rango invertido (máximo menor que el mínimo)', async () => {
    const user = createUserEvent();
    await fillByLabel(user, 'Mínimo', '10');
    await fillByLabel(user, 'Máximo', '1');
    generate();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('debe ser mayor o igual');
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it('el error se limpia al volver a sortear con datos válidos', async () => {
    const user = createUserEvent();
    await fillByLabel(user, 'Cantidad', '10');
    await fillByLabel(user, 'Mínimo', '1');
    await fillByLabel(user, 'Máximo', '5');
    generate();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await fillByLabel(user, 'Cantidad', '3');
    generate();

    await waitFor(() => expect(document.querySelector('#numbers-result')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sortea con la estrategia compartida: el resultado viene ordenado', async () => {
    const user = createUserEvent();
    await fillByLabel(user, 'Cantidad', '6');
    await fillByLabel(user, 'Mínimo', '1');
    await fillByLabel(user, 'Máximo', '100');
    generate();

    await waitFor(() => expect(document.querySelector('#numbers-result')).toBeInTheDocument());

    const parsed = resultNumbers();
    expect(parsed).toEqual([...parsed].sort((a, b) => a - b));
  });

  it('sin sesión no llama al backend', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const user = createUserEvent();
    await fillByLabel(user, 'Cantidad', '3');
    generate();

    await waitFor(() => expect(document.querySelector('#numbers-result')).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
