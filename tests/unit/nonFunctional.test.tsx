// @vitest-environment jsdom
// Pruebas no funcionales (plan sección 6): accesibilidad, navegación por
// teclado, limpieza de animaciones y seguridad (XSS).
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RootLayout } from '../../src/components/RootLayout';
import { DicePage } from '../../src/pages/DicePage';
import { WeightedPage } from '../../src/pages/WeightedPage';
import { RoulettePage } from '../../src/pages/RoulettePage';
import { useHistoryStore } from '../../src/store/historyStore';
import { installLocalStorage } from './helpers/localStorageMock';
import {
  mockCanvasContext,
  mockNativeDialog,
  mockRequestAnimationFrame,
} from './helpers/domMocks';

const fill = (selector: string, value: string) => {
  const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!input) throw new Error(`Input no encontrado: ${selector}`);
  fireEvent.change(input, { target: { value } });
};

describe('accesibilidad (roles WAI-ARIA)', () => {
  beforeEach(() => {
    installLocalStorage();
    useHistoryStore.setState({ entries: [] });
    render(<DicePage />);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('no expone el tablist de Números y separa la animación del anuncio final', () => {
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(document.querySelector('#dice-result')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(document.querySelector('#dice-result')).not.toHaveAttribute(
      'aria-live',
    );
  });
});

describe('estructura semántica (WAI-ARIA)', () => {
  afterEach(() => {
    cleanup();
  });

  it('expone roles estructurales banner (nav) y main (vista)', () => {
    render(
      <MemoryRouter initialEntries={['/dice']}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route path="dice" element={<DicePage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('navegación por teclado', () => {
  beforeEach(() => {
    installLocalStorage();
    useHistoryStore.setState({ entries: [] });
    render(<DicePage />);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('activa un dado con Enter desde el teclado (foco + Enter)', async () => {
    mockRequestAnimationFrame();
    const user = userEvent.setup();
    const d20 = screen.getByRole('button', { name: 'd20' });
    d20.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(document.querySelector('#dice-total')).toBeInTheDocument());
    expect(useHistoryStore.getState().entries.at(-1)?.module).toBe('dice');
  });
});

describe('limpieza de animaciones', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('removeEventListener("resize") al desmontar la ruleta', () => {
    mockCanvasContext();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    render(<RoulettePage />);
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('cancela la animación de tirada al desmontar (dice)', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    // rAF que NO invoca el callback → la animación queda pendiente al desmontar.
    vi.stubGlobal('requestAnimationFrame', () => 42);

    installLocalStorage();
    useHistoryStore.setState({ entries: [] });
    render(<DicePage />);
    fireEvent.click(screen.getByRole('button', { name: 'd20' }));

    cleanup();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });

  it('cancela la animación al desmontar (ruleta)', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    vi.stubGlobal('requestAnimationFrame', () => 7);
    mockCanvasContext();

    installLocalStorage();
    useHistoryStore.setState({ entries: [] });
    render(<RoulettePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Girar ruleta' }));

    cleanup();
    expect(cancelSpy).toHaveBeenCalledWith(7);
  });

  it('al abrir el modal de resultado la ruleta, el diálogo queda abierto', async () => {
    const rafCalls: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCalls.push(cb);
      return rafCalls.length;
    });
    mockNativeDialog();

    render(<RoulettePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Girar ruleta' }));

    act(() => {
      rafCalls[0](1); // delta << duración → sigue girando
    });
    act(() => {
      rafCalls[1](1e9); // delta >> duración → commitea el giro
    });

    await waitFor(() =>
      expect(
        document.querySelector('#roulette-result-overlay'),
      ).toHaveAttribute('open'),
    );

    // El diálogo nativo queda abierto; el botón de cierre es el objetivo de foco.
    const dialog = document.querySelector(
      '#roulette-result-overlay',
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });
});

describe('seguridad — XSS', () => {
  beforeEach(() => {
    installLocalStorage();
    useHistoryStore.setState({ entries: [] });
    render(<WeightedPage />);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renderiza un nombre con <script> como texto plano (sin crear elemento vivo)', () => {
    const malicious = '<script>alert(1)</script>';
    fill('#weighted-name', malicious);
    fill('#weighted-weight', '1');
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar' }));

    const li = document.querySelector('#weighted-list li');
    expect(li).not.toBeNull();
    // Aparece como texto (escapado), no como <script> ejecutable.
    expect(li!.textContent).toContain(malicious);
    expect(document.querySelectorAll('script').length).toBe(0);
  });

  it('muestra el HTML como entidades escapadas en el innerHTML', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    fill('#weighted-name', malicious);
    fill('#weighted-weight', '1');
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar' }));

    const list = document.querySelector('#weighted-list')!;
    expect(list.innerHTML).toContain('&lt;img');
    expect(document.querySelector('#weighted-list img')).toBeNull();
    expect(list.textContent).toContain(malicious);
  });
});
