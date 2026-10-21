// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WeightedPage } from '../../../src/pages/WeightedPage';
import { loadWeightedOptions } from '../../../src/lib/storage';
import { weightedStrategy } from '../../../src/strategies/WeightedStrategy';
import { useHistoryStore } from '../../../src/store/historyStore';
import { createUserEvent, fillByLabel } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';

const resetHistory = () => useHistoryStore.setState({ entries: [] });

function renderWeighted() {
  return render(<WeightedPage />);
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

const participantNames = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-weighted-row] span.font-semibold',
    ),
  ).map((node) => node.textContent?.trim());

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

  it('agrupa los controles de alta de participante', () => {
    expect(
      screen.getByRole('group', { name: 'Agregar participante' }),
    ).toBeInTheDocument();
  });

  it('renderiza el form, la lista vacía, el motivo y botones deshabilitados', () => {
    expect(screen.getByText(/Sin participantes cargados/)).toBeInTheDocument();
    expect(
      screen.getByText('Agregá al menos un participante para poder sortear.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sortear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeDisabled();
    expect(
      screen.queryByRole('checkbox', { name: 'Auto-eliminar ganadores' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Carga masiva')).toBeInTheDocument();
    expect(
      screen.getByText('1 a 100: cuanto más peso, más probabilidad.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Formato:/)).toBeInTheDocument();
    expect(document.querySelector('#weighted-bulk-details')).not.toHaveAttribute(
      'open',
    );
  });

  it('agrega participantes y muestra las barras de % proporcionales', async () => {
    await addParticipant('Ana', 3);
    await addParticipant('Juan', 7);

    expect(participantNames()).toEqual(['Ana', 'Juan']);
    expect(screen.getByText('peso 3')).toBeInTheDocument();
    expect(screen.getByText('peso 7')).toBeInTheDocument();

    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(
      screen.getByText('Peso total: 10 · 2 participantes'),
    ).toBeInTheDocument();

    const bars = Array.from(
      document.querySelectorAll<HTMLElement>('[data-weighted-bar]'),
    );
    expect(bars).toHaveLength(2);
    expect(bars[0].style.width).toBe('30%');
    expect(bars[1].style.width).toBe('70%');
    const track = document.querySelector<HTMLElement>('[data-weighted-track]');
    expect(track).toHaveClass('h-2.5', 'bg-surface-sunken');
  });

  it('reparte porcentajes que suman 100%', async () => {
    await addParticipant('Ana', 1);
    await addParticipant('Juan', 1);
    await addParticipant('Carla', 1);

    const percents = Array.from(
      document.querySelectorAll<HTMLElement>('[data-weighted-percent]'),
    ).map((node) => Number(node.textContent?.replace('%', '')));
    expect(percents.reduce((acc, value) => acc + value, 0)).toBeCloseTo(100, 5);
  });

  it('edita nombre y peso, y quita participantes', async () => {
    await addParticipant('Ana', 3);
    await addParticipant('Juan', 7);

    fireEvent.click(screen.getByRole('button', { name: 'Editar Ana' }));
    fireEvent.change(screen.getByLabelText('Nombre del participante'), {
      target: { value: 'Beto' },
    });
    fireEvent.change(screen.getByLabelText('Peso del participante'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(participantNames()).toEqual(['Beto', 'Juan']);
    expect(screen.getByText('peso 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Juan' }));
    expect(participantNames()).toEqual(['Beto']);

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(participantNames()).toEqual(['Beto']);
  });

  it('rechaza un peso decimal en edición y conserva los datos', async () => {
    await addParticipant('Ana', 3);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Ana' }));
    fireEvent.change(screen.getByLabelText('Peso del participante'), {
      target: { value: '3.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'entero entre 1 y 100',
    );
    expect(screen.getByLabelText('Peso del participante')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Nombre del participante')).toHaveValue('Ana');
    expect(loadWeightedOptions()?.entries).toEqual([
      { name: 'Ana', weight: 3 },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(participantNames()).toEqual(['Ana']);
  });

  it('mueve el foco al editar, guardar, cancelar y quitar', async () => {
    const user = createUserEvent();
    await addParticipant('Ana', 3);
    await addParticipant('Juan', 7);

    await user.click(screen.getByRole('button', { name: 'Editar Ana' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByLabelText('Nombre del participante'),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Editar Ana' }),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Editar Ana' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Editar Ana' }),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Quitar Juan' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: 'Participantes' }),
      ),
    );
  });

  it('carga una lista masiva y conserva las líneas inválidas', async () => {
    const bulk = screen.getByLabelText('Una persona por línea');
    fireEvent.change(bulk, {
      target: {
        value: 'Ana, 3\n\nBruno, mal\nCarla\nDiego, 200\nEva, 5',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar lista' }));

    expect(participantNames()).toEqual(['Ana', 'Carla', 'Eva']);
    expect(participantNames()).not.toContain('Bruno');
    expect(participantNames()).not.toContain('Diego');
    expect(screen.getByRole('alert')).toHaveTextContent('Bruno, mal');
    expect(screen.getByRole('alert')).toHaveTextContent('Diego, 200');
    expect(bulk).toHaveValue('Bruno, mal\nDiego, 200');
  });

  it('restaura participantes y pesos, y los restablece', async () => {
    cleanup();
    const first = renderWeighted();
    await addParticipant('Ana', 3);
    await addParticipant('Juan', 7);

    first.unmount();
    renderWeighted();

    expect(participantNames()).toEqual(['Ana', 'Juan']);
    expect(screen.getByText('peso 3')).toBeInTheDocument();
    expect(screen.getByText('peso 7')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(screen.getByText(/Sin participantes cargados/)).toBeInTheDocument();
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

  it('al sortear enfoca el encabezado del resultado y desplaza el resultado completo', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const calls: Array<{
      element: HTMLElement;
      options?: ScrollIntoViewOptions;
    }> = [];
    const scrollIntoView = vi.fn(function (
      this: HTMLElement,
      options?: boolean | ScrollIntoViewOptions,
    ) {
      calls.push({
        element: this,
        options: typeof options === 'object' ? options : undefined,
      });
    });
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      await addParticipant('Ana', 5);
      draw();

      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Ganador' })).toHaveFocus(),
      );
      expect(calls[0]?.element.id).toBe('weighted-result');
      expect(calls[0]?.options).toEqual({
        block: 'nearest',
        behavior: 'smooth',
      });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
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
    await addParticipant('Ana', 1);
    await addParticipant('Juan', 1);
    await addParticipant('Carla', 1);
    await user.click(screen.getByRole('checkbox', { name: 'Auto-eliminar ganadores' }));
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
    expect(document.querySelector('#weighted-draw-btn')).toHaveAttribute(
      'aria-describedby',
      'weighted-error',
    );
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
    await addParticipant('Ana', 1);
    await addParticipant('Juan', 1);
    await addParticipant('Carla', 1);
    await user.click(screen.getByRole('checkbox', { name: 'Auto-eliminar ganadores' }));
    draw();

    await waitFor(() => expect(document.querySelector('#weighted-result')).toBeInTheDocument());
    expect(document.querySelectorAll('#weighted-list li')).toHaveLength(2);

    reset();
    expect(document.querySelectorAll('#weighted-list li')).toHaveLength(3);
    expect(document.querySelector('#weighted-result')).not.toBeInTheDocument();
  });
});
