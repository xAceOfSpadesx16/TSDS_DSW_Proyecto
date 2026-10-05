// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoulettePage } from '../../../src/pages/RoulettePage';
import { rouletteStrategy } from '../../../src/strategies/RouletteStrategy';
import { useHistoryStore } from '../../../src/store/historyStore';
import { createUserEvent, fillByLabel } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';
import { mockCanvasContext, mockNativeDialog } from '../helpers/domMocks';

const DEFAULT_COLOR = '#6c5ce7';
const resetHistory = () => useHistoryStore.setState({ entries: [] });

function renderRoulette() {
  render(<RoulettePage />);
}

const addOption = async (label: string, color = DEFAULT_COLOR) => {
  const user = createUserEvent();
  await fillByLabel(user, 'Opción', label);
  // Los inputs de color no aceptan tipeo por teclado; se establece el valor.
  fireEvent.change(screen.getByLabelText('Color') as HTMLInputElement, {
    target: { value: color },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar opción' }));
};

const removeOption = (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Quitar opción ${label}` }));
};

describe('RoulettePage — opciones', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    mockCanvasContext();
    renderRoulette();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renderiza con las opciones por defecto (Sí/No) y el canvas', () => {
    expect(screen.getByText('Sí')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(document.querySelector('#roulette-canvas')).toBeInTheDocument();
    // El canvas tiene un contexto 2D (no dispara "Not implemented" en jsdom).
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
  });

  it('agrega una opción y resetea el label y el color', async () => {
    await addOption('Opción A', '#ff0000');
    expect(screen.getByText('Opción A')).toBeInTheDocument();
    expect(screen.getByLabelText('Opción')).toHaveValue('');
    expect(screen.getByLabelText('Color')).toHaveValue(DEFAULT_COLOR);
  });

  it('no agrega una opción con el label en blanco', () => {
    // El input es `required`: jsdom bloquea el submit y onAddOption no dispara.
    fireEvent.click(screen.getByRole('button', { name: 'Agregar opción' }));
    expect(screen.queryByText('Opción A')).not.toBeInTheDocument();
  });

  it('elimina una opción con el botón ×', () => {
    removeOption('No');
    expect(screen.queryByText('No')).not.toBeInTheDocument();
    expect(screen.getByText('Sí')).toBeInTheDocument();
  });

  it('repinta el canvas cada vez que cambian las opciones', async () => {
    const ctxSpy = HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.spyOn>;
    const callsBefore = ctxSpy.mock.calls.length;
    await addOption('Opción B');
    expect(ctxSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('remueve el listener de resize al desmontar', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    renderRoulette();
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('repinta el canvas al redimensionar la ventana', () => {
    const ctxSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const callsBefore = ctxSpy.mock.calls.length;
    window.dispatchEvent(new Event('resize'));
    expect(ctxSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('RoulettePage — giro', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    mockCanvasContext();
    renderRoulette();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('deshabilita el botón de giro con menos de 2 opciones', () => {
    removeOption('No');
    const spin = screen.getByRole('button', { name: 'Girar ruleta' });
    expect(spin).toBeDisabled();
  });

  it('muestra una alerta de error cuando la estrategia falla', async () => {
    vi.spyOn(rouletteStrategy, 'execute').mockImplementation(() => {
      throw new Error('Fallo al girar');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Girar ruleta' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Fallo al girar');
  });

  it('gira, anima, abre el modal con el ganador y lo cierra', async () => {
    // rAF controlado: observamos el estado "Girando..." y luego commiteamos.
    const rafCalls: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCalls.push(cb);
      return rafCalls.length;
    });
    const { showModal, close } = mockNativeDialog();

    const spin = screen.getByRole('button', { name: 'Girar ruleta' });
    fireEvent.click(spin);

    // Estado intermedio: todavía girando.
    expect(screen.getByRole('button', { name: 'Girando...' })).toBeInTheDocument();
    expect(spin).toBeDisabled();

    act(() => {
      rafCalls[0](1); // delta < duración → sigue girando (spinning=true)
    });
    act(() => {
      rafCalls[1](1e9); // delta >> duración → commitea el giro
    });

    await waitFor(() => expect(showModal).toHaveBeenCalled());

    const winner = document.querySelector('#roulette-result-text')!.textContent!;
    expect(['Sí', 'No']).toContain(winner);

    const entries = useHistoryStore.getState().entries;
    expect(entries[0].module).toBe('roulette');
    expect(entries[0].description).toMatch(/^Ganador: (Sí|No)$/);

    // Cerrar el modal.
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(close).toHaveBeenCalled());
  });
});
