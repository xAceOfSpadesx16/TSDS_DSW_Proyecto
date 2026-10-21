// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoulettePage } from '../../../src/pages/RoulettePage';
import { rouletteStrategy } from '../../../src/strategies/RouletteStrategy';
import { saveRouletteOptions } from '../../../src/lib/storage';
import { useHistoryStore } from '../../../src/store/historyStore';
import { createUserEvent, fillByLabel } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';
import { mockCanvasContext, mockNativeDialog } from '../helpers/domMocks';

const DEFAULT_COLOR = '#1f4fb5';
const resetHistory = () => useHistoryStore.setState({ entries: [] });

function renderRoulette() {
  return render(<RoulettePage />);
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

  it('mantiene un color distinto por opción al superar la paleta', async () => {
    for (let index = 0; index < 7; index += 1) {
      await addOption(`Extra ${index + 1}`);
    }
    const dots = Array.from(
      document.querySelectorAll(
        '#roulette-options-list li > span[aria-hidden="true"]',
      ),
    );
    const colors = dots.map((dot) => dot.getAttribute('style'));
    expect(colors).toHaveLength(9);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('normaliza colores duplicados al restaurar opciones', () => {
    cleanup();
    saveRouletteOptions(
      Array.from({ length: 10 }, (_, index) => ({
        label: `Restaurada ${index + 1}`,
        color: DEFAULT_COLOR,
      })),
    );
    renderRoulette();
    const dots = Array.from(
      document.querySelectorAll(
        '#roulette-options-list li > span[aria-hidden="true"]',
      ),
    );
    const colors = dots.map((dot) => dot.getAttribute('style'));
    expect(colors).toHaveLength(10);
    expect(new Set(colors).size).toBe(colors.length);
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
    const ctxSpy = vi.mocked(HTMLCanvasElement.prototype.getContext);
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

  it('expone el canvas como imagen, la lista de opciones y el grupo del formulario', () => {
    expect(
      screen.getByRole('img', { name: /Ruleta de decisiones con 2 opciones/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Opciones cargadas' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Nueva opción' })).toBeInTheDocument();
  });

  it('restaura las opciones y las restablece', async () => {
    cleanup();
    const first = renderRoulette();
    await addOption('Quizás', '#00ff00');

    first.unmount();
    renderRoulette();

    expect(screen.getByText('Quizás')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(screen.queryByText('Quizás')).not.toBeInTheDocument();
    expect(screen.getByText('Sí')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
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
    expect(document.querySelector('#roulette-spin-btn')).toHaveAttribute(
      'aria-describedby',
      'roulette-error',
    );
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

    // Estado intermedio: todavía girando y con las opciones bloqueadas.
    expect(screen.getByRole('button', { name: 'Girando...' })).toBeInTheDocument();
    expect(spin).toBeDisabled();
    expect(screen.getByLabelText('Opción')).toBeDisabled();
    expect(screen.getByLabelText('Color')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Agregar opción' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Quitar opción Sí' }),
    ).toBeDisabled();

    act(() => {
      rafCalls[0](1); // delta < duración → sigue girando (spinning=true)
    });
    act(() => {
      rafCalls[1](1e9); // delta >> duración → commitea el giro
    });

    await waitFor(() => expect(showModal).toHaveBeenCalled());
    const dialog = document.getElementById(
      'roulette-result-overlay',
    ) as HTMLDialogElement;
    expect(dialog).toHaveAttribute(
      'aria-labelledby',
      'roulette-result-title',
    );
    expect(document.getElementById('roulette-result-title')).toHaveTextContent(
      '¡Ganador!',
    );

    const winner = document.querySelector('#roulette-result-text')!.textContent!;
    expect(['Sí', 'No']).toContain(winner);

    const entries = useHistoryStore.getState().entries;
    expect(entries[0].module).toBe('roulette');
    expect(entries[0].description).toMatch(/^Ganador: (Sí|No)$/);

    // Cerrar el modal: el foco vuelve al botón de girar.
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    dialog.dispatchEvent(new Event('close'));
    await waitFor(() => expect(document.activeElement).toBe(spin));
  });

  it('con prefers-reduced-motion muestra el ganador sin animación', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    const { showModal } = mockNativeDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Girar ruleta' }));

    await waitFor(() => expect(showModal).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toHaveAttribute(
      'aria-labelledby',
      'roulette-result-title',
    );
    expect(screen.getByRole('button', { name: 'Girar ruleta' })).not.toBeDisabled();
  });
});
