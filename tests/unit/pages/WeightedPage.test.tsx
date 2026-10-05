// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WeightedPage } from '../../../src/pages/WeightedPage';
import { weightedStrategy } from '../../../src/strategies/WeightedStrategy';
import { useHistoryStore } from '../../../src/store/historyStore';
import { createUserEvent, fillByLabel } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';

const resetHistory = () => useHistoryStore.setState({ entries: [] });

function renderWeighted() {
  render(<WeightedPage />);
}

const addParticipant = async (name: string, weight: number) => {
  const user = createUserEvent();
  await fillByLabel(user, 'Nombre', name);
  // El campo "Peso" tiene clamp onChange (mín. 1) que mapea "" → 1; userEvent
  // clear() no puede vaciarlo, así que se establece el valor directo.
  fireEvent.change(screen.getByLabelText('Peso') as HTMLInputElement, {
    target: { value: String(weight) },
  });
  fireEvent.click(screen.getByRole('button', { name: '+ Agregar' }));
};

const draw = () => fireEvent.click(screen.getByRole('button', { name: 'Sortear' }));
const reset = () => fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));

describe('WeightedPage — participantes y barras', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    renderWeighted();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renderiza el form, la lista vacía y botones deshabilitados al inicio', () => {
    expect(screen.getByText(/Sin participantes cargados/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sortear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeDisabled();
  });

  it('agrega participantes y muestra las barras de % proporcionales', async () => {
    await addParticipant('Ana', 3);
    await addParticipant('Juan', 7);

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('peso 3')).toBeInTheDocument();
    expect(screen.getByText('peso 7')).toBeInTheDocument();

    const bars = Array.from(document.querySelectorAll('#weighted-list output'));
    expect(bars).toHaveLength(2);
    expect(bars[0].style.width).toBe('30%');
    expect(bars[1].style.width).toBe('70%');
  });
});

describe('WeightedPage — sorteo', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    renderWeighted();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sortea un participante y muestra ganador + probabilidad (100%)', async () => {
    await addParticipant('Ana', 5);
    draw();

    await waitFor(() => expect(document.querySelector('#weighted-result')).toBeInTheDocument());
    expect(document.querySelector('#weighted-result')).toHaveTextContent('Ana');
    expect(document.querySelector('#weighted-result')).toHaveTextContent('Probabilidad: 100%');

    expect(useHistoryStore.getState().entries[0].description).toBe('Ganador: Ana (100%)');
  });

  it('mantiene la lista intacta sin auto-eliminación', async () => {
    await addParticipant('Ana', 1);
    await addParticipant('Juan', 1);
    await addParticipant('Carla', 1);
    draw();

    await waitFor(() => expect(document.querySelector('#weighted-result')).toBeInTheDocument());
    expect(document.querySelectorAll('#weighted-list li')).toHaveLength(3);
  });

  it('reduce la lista con auto-eliminación', async () => {
    const user = createUserEvent();
    await user.click(screen.getByRole('checkbox', { name: 'Auto-eliminar ganadores' }));
    await addParticipant('Ana', 1);
    await addParticipant('Juan', 1);
    await addParticipant('Carla', 1);
    draw();

    await waitFor(() => expect(document.querySelector('#weighted-result')).toBeInTheDocument());
    expect(document.querySelectorAll('#weighted-list li')).toHaveLength(2);
  });

  it('muestra un mensaje de error cuando la estrategia falla', async () => {
    vi.spyOn(weightedStrategy, 'execute').mockImplementation(() => {
      throw new Error('Pesos inválidos');
    });

    await addParticipant('Ana', 1);
    draw();

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Pesos inválidos');
  });
});

describe('WeightedPage — reinicio', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    renderWeighted();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('restaura la lista original tras un sorteo con auto-eliminación', async () => {
    const user = createUserEvent();
    await user.click(screen.getByRole('checkbox', { name: 'Auto-eliminar ganadores' }));
    await addParticipant('Ana', 1);
    await addParticipant('Juan', 1);
    await addParticipant('Carla', 1);
    draw();

    await waitFor(() => expect(document.querySelector('#weighted-result')).toBeInTheDocument());
    expect(document.querySelectorAll('#weighted-list li')).toHaveLength(2);

    reset();
    expect(document.querySelectorAll('#weighted-list li')).toHaveLength(3);
    expect(document.querySelector('#weighted-result')).not.toBeInTheDocument();
  });
});
