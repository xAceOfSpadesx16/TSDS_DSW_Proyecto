// @vitest-environment jsdom
//
// Regresión de contenido HTML: `output` solo admite contenido de frase. Los
// resultados estructurados viven en una `section` y el anuncio accesible en un
// `output` aparte con texto plano. Este test recorre las cinco pantallas con
// un resultado generado para que el anidamiento inválido no vuelva.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DicePage } from '../../../src/pages/DicePage';
import { NumbersPage } from '../../../src/pages/NumbersPage';
import { RoulettePage } from '../../../src/pages/RoulettePage';
import { TeamsPage } from '../../../src/pages/TeamsPage';
import { WeightedPage } from '../../../src/pages/WeightedPage';
import { useHistoryStore } from '../../../src/store/historyStore';
import { useAuthStore } from '../../../src/store/authStore';
import {
  mockCanvasContext,
  mockNativeDialog,
  mockRequestAnimationFrame,
} from '../helpers/domMocks';
import { installLocalStorage } from '../helpers/localStorageMock';

const BLOCK_DESCENDANTS = 'div, ul, ol, h2, h3, section, p';

function expectOutputsWithoutBlocks(): void {
  const outputs = Array.from(document.querySelectorAll('output'));
  for (const output of outputs) {
    expect(
      output.querySelectorAll(BLOCK_DESCENDANTS),
      `#${output.id || 'output'} no debe contener elementos de bloque`,
    ).toHaveLength(0);
  }
}

describe('HTML — contenido permitido en output', () => {
  beforeEach(() => {
    installLocalStorage();
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    useHistoryStore.setState({ entries: [] });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('las cinco pantallas de sorteo generan resultados sin bloques dentro de output', async () => {
    mockRequestAnimationFrame();
    mockCanvasContext();
    mockNativeDialog();

    render(<DicePage />);
    fireEvent.click(screen.getByRole('button', { name: 'd6' }));
    await waitFor(() => expect(document.querySelector('#dice-total')).toBeInTheDocument());
    expectOutputsWithoutBlocks();
    cleanup();

    render(<NumbersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));
    await waitFor(() =>
      expect(document.querySelector('#numbers-result')).toBeInTheDocument(),
    );
    expectOutputsWithoutBlocks();
    cleanup();

    render(<TeamsPage />);
    fireEvent.change(screen.getByLabelText('Participantes (uno por línea)'), {
      target: { value: 'Ana\nBruno\nCarla\nDiego' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar Equipos' }));
    await waitFor(() =>
      expect(document.querySelector('#team-results')).toBeInTheDocument(),
    );
    expectOutputsWithoutBlocks();
    cleanup();

    render(<WeightedPage />);
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Ana' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sortear' }));
    await waitFor(() =>
      expect(document.querySelector('#weighted-result')).toBeInTheDocument(),
    );
    expectOutputsWithoutBlocks();
    cleanup();

    render(<RoulettePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Girar ruleta' }));
    await waitFor(() =>
      expect(document.querySelector('#roulette-result-overlay')).toHaveAttribute(
        'open',
      ),
    );
    expectOutputsWithoutBlocks();
  });
});
