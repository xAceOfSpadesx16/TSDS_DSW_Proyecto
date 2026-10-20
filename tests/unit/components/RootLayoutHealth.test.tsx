// @vitest-environment jsdom
// =============================================================================
// RootLayout — indicador de conexión con `/api/health`.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RootLayout } from '../../../src/components/RootLayout';
import {
  ApiError,
  type CreateHistoryPayload,
  type HealthStatus,
} from '../../../src/domain/types';
import { useAuthStore } from '../../../src/store/authStore';
import { useHistoryStore } from '../../../src/store/historyStore';

// Health, legal e historial van por red: se mockean los repositorios.
vi.mock('../../../src/repositories/healthRepository', () => ({
  healthRepository: {
    check: vi.fn(),
  },
}));

vi.mock('../../../src/repositories/legalRepository', () => ({
  legalRepository: {
    getDisclaimer: vi.fn(),
  },
}));

vi.mock('../../../src/repositories/historyRepository', () => ({
  historyRepository: {
    create: vi.fn(),
  },
}));

const { healthRepository } = await import('../../../src/repositories/healthRepository');
const { legalRepository } = await import('../../../src/repositories/legalRepository');
const { historyRepository } = await import('../../../src/repositories/historyRepository');

const PENDING_RECORD: CreateHistoryPayload = {
  module_name: 'dice',
  action: 'd20',
  payload: { sides: 20, modifier: 0 },
  result: { rolls: [15], modifier: 0, total: 15 },
};

const OK: HealthStatus = {
  status: 'ok',
  service: 'ThriveRandomizer',
  version: '1.0.0',
  timestamp: '2026-10-05T00:00:00.000Z',
};

function renderLayout() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <RootLayout />
    </MemoryRouter>,
  );
}

describe('RootLayout — indicador de conexión', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    useHistoryStore.setState({ entries: [] });
    vi.mocked(healthRepository.check).mockReset();
    vi.mocked(legalRepository.getDisclaimer).mockReset();
    vi.mocked(historyRepository.create).mockReset();
    // El disclaimer no es foco de estos tests: se resuelve con un valor
    // cualquiera para que no aparezca el pie ni ensucie las queries.
    vi.mocked(legalRepository.getDisclaimer).mockResolvedValue({
      title: 'Disclaimer',
      version: '1.0.0',
      sections: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('consulta el health una vez al arrancar', async () => {
    vi.mocked(healthRepository.check).mockResolvedValue(OK);
    renderLayout();

    await waitFor(() => expect(healthRepository.check).toHaveBeenCalledTimes(1));
  });

  it('no muestra aviso cuando el backend responde', async () => {
    vi.mocked(healthRepository.check).mockResolvedValue(OK);
    renderLayout();

    await waitFor(() => expect(healthRepository.check).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra un aviso con role="status" cuando el health falla', async () => {
    vi.mocked(healthRepository.check).mockRejectedValue(
      new ApiError(503, { message: 'Service Unavailable' }),
    );
    renderLayout();

    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('No se pudo conectar con el servidor');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('el aviso no bloquea la app: el outlet sigue renderizando', async () => {
    vi.mocked(healthRepository.check).mockRejectedValue(new Error('Failed to fetch'));
    renderLayout();

    await screen.findByRole('status');
    // El header (estructura común) sigue montado.
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('el aviso desaparece tras un reintento exitoso', async () => {
    const user = userEvent.setup();
    vi.mocked(healthRepository.check)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(OK);
    renderLayout();

    const banner = await screen.findByRole('status');
    expect(banner).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(healthRepository.check).toHaveBeenCalledTimes(2);
  });

  it('el aviso sigue visible si el reintento vuelve a fallar', async () => {
    const user = userEvent.setup();
    vi.mocked(healthRepository.check).mockRejectedValue(new Error('Failed to fetch'));
    renderLayout();

    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(healthRepository.check).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('reintenta los sorteos pendientes cuando el health se recupera', async () => {
    const user = userEvent.setup();
    vi.mocked(healthRepository.check)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(OK);
    vi.mocked(historyRepository.create).mockResolvedValue({
      data: {
        id: 'srv-1',
        user_id: 7,
        module_name: 'dice',
        action: 'd20',
        payload: { sides: 20, modifier: 0 },
        result: { rolls: [15], modifier: 0, total: 15 },
        created_at: '2026-10-05T00:00:00.000Z',
        updated_at: '2026-10-05T00:00:00.000Z',
      },
    });
    useAuthStore.setState({
      user: { id: 7, name: 'Ada', email: 'ada@example.com' },
      token: 'jwt',
      expiresAt: null,
    });
    useHistoryStore.setState({
      entries: [
        {
          id: 'p1',
          module: 'dice',
          description: 'd20 = 15',
          timestamp: '2026-10-05T00:00:00.000Z',
          synced: false,
          pending: { record: PENDING_RECORD, userId: 7 },
        },
      ],
    });

    renderLayout();

    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(historyRepository.create).toHaveBeenCalledWith(PENDING_RECORD),
    );
    expect(useHistoryStore.getState().entries[0].pending).toBeUndefined();
    expect(useHistoryStore.getState().entries[0].synced).toBe(true);
  });
});
