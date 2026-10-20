// @vitest-environment jsdom
// =============================================================================
// Persistencia — datos corruptos no deben romper ninguna pantalla.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { DicePage } from '../../../src/pages/DicePage';
import { NumbersPage } from '../../../src/pages/NumbersPage';
import { RoulettePage } from '../../../src/pages/RoulettePage';
import { TeamsPage } from '../../../src/pages/TeamsPage';
import { WeightedPage } from '../../../src/pages/WeightedPage';
import { useHistoryStore } from '../../../src/store/historyStore';
import { installLocalStorage } from '../helpers/localStorageMock';
import { mockCanvasContext } from '../helpers/domMocks';

const CORRUPT_KEYS = [
  'thrive_guest_history_v1',
  'thrive_pending_7_v1',
  'thrive_dice_options_v1',
  'thrive_numbers_options_v1',
  'thrive_roulette_options_v1',
  'thrive_teams_options_v1',
  'thrive_weighted_options_v1',
];

describe('pantallas con storage corrupto', () => {
  beforeEach(() => {
    installLocalStorage();
    for (const key of CORRUPT_KEYS) {
      localStorage.setItem(key, '{no-es-json');
    }
    useHistoryStore.setState({
      entries: [],
      guestEntries: [],
      guestImportPending: false,
      guestImportError: null,
      error: null,
    });
    mockCanvasContext();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Dados muestra sus valores por defecto', () => {
    render(<DicePage />);
    expect(screen.getByRole('heading', { name: 'Dados RPG' })).toBeInTheDocument();
    expect(screen.getByLabelText('Modificador')).toHaveValue(0);
    expect(screen.getByRole('button', { name: 'Restablecer' })).toBeInTheDocument();
  });

  it('Números muestra sus valores por defecto', () => {
    render(<NumbersPage />);
    expect(screen.getByRole('heading', { name: 'Números aleatorios' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad')).toHaveValue(5);
    expect(screen.getByLabelText('Mínimo')).toHaveValue(1);
    expect(screen.getByLabelText('Máximo')).toHaveValue(50);
    expect(screen.getByLabelText('Sin repetición')).toBeChecked();
  });

  it('Equipos arranca vacío y sin exclusiones', () => {
    render(<TeamsPage />);
    expect(
      screen.getByRole('heading', { name: 'Generador de Equipos' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Participantes (uno por línea)')).toHaveValue('');
    expect(screen.queryByText('↔')).not.toBeInTheDocument();
  });

  it('Ponderado arranca sin participantes', () => {
    render(<WeightedPage />);
    expect(
      screen.getByRole('heading', { name: 'Sorteo con Pesos' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sin participantes cargados/)).toBeInTheDocument();
  });

  it('Ruleta vuelve a las opciones por defecto', () => {
    render(<RoulettePage />);
    expect(
      screen.getByRole('heading', { name: 'Ruleta de Decisiones' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sí')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });
});
