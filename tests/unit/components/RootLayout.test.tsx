// @vitest-environment jsdom
// =============================================================================
// RootLayout — estructura común (Header + Outlet) y disclaimer en el pie.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RootLayout } from '../../../src/components/RootLayout';
import { ApiError, type LegalDisclaimer } from '../../../src/domain/types';
import { useAuthStore } from '../../../src/store/authStore';
import { useHistoryStore, type LocalHistoryEntry } from '../../../src/store/historyStore';
import { mockNativeDialog } from '../helpers/domMocks';

// El disclaimer se pide por red; se mockea el repositorio para poder
// controlar tanto el éxito como el fallo.
vi.mock('../../../src/repositories/legalRepository', () => ({
  legalRepository: {
    getDisclaimer: vi.fn(),
  },
}));

const { legalRepository } = await import('../../../src/repositories/legalRepository');

const DISCLAIMER: LegalDisclaimer = {
  title: 'Disclaimer - Thrive Randomizer',
  version: '1.0.0',
  sections: [
    { heading: 'Naturaleza del servicio', body: 'Herramienta recreativa.' },
    { heading: 'Cálculo en el cliente', body: 'Se calcula en el navegador.' },
  ],
};

describe('RootLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    useHistoryStore.setState({
      guestEntries: [],
      guestImportPending: false,
      guestImportError: null,
    });
    vi.mocked(legalRepository.getDisclaimer).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renderiza el Header y el Outlet de las rutas hijas', async () => {
    vi.mocked(legalRepository.getDisclaimer).mockResolvedValue(DISCLAIMER);
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route path="dashboard" element={<h1>Dashboard</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Estructura común: el Header está presente en todas las páginas.
    expect(screen.getByRole('link', { name: 'Thrive Randomizer' })).toBeInTheDocument();
    // El Outlet renderiza el contenido de la ruta hija.
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renderiza el Header aunque no haya ruta hija que coincida', async () => {
    vi.mocked(legalRepository.getDisclaimer).mockResolvedValue(DISCLAIMER);
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route path="dashboard" element={<h1>Dashboard</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Thrive Randomizer' })).toBeInTheDocument();
    // No coincide ninguna ruta hija, así que el Outlet queda vacío.
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});

describe('RootLayout — disclaimer', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    useHistoryStore.setState({
      guestEntries: [],
      guestImportPending: false,
      guestImportError: null,
    });
    vi.mocked(legalRepository.getDisclaimer).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('pide el disclaimer una vez al montar', async () => {
    vi.mocked(legalRepository.getDisclaimer).mockResolvedValue(DISCLAIMER);
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootLayout />
      </MemoryRouter>,
    );

    await waitFor(() => expect(legalRepository.getDisclaimer).toHaveBeenCalledTimes(1));
  });

  it('muestra el título y la versión en el pie', async () => {
    vi.mocked(legalRepository.getDisclaimer).mockResolvedValue(DISCLAIMER);
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootLayout />
      </MemoryRouter>,
    );

    const footer = await screen.findByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(screen.getByText('Disclaimer - Thrive Randomizer')).toBeInTheDocument();
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
  });

  it('deja las secciones dentro de un details cerrado por defecto', async () => {
    vi.mocked(legalRepository.getDisclaimer).mockResolvedValue(DISCLAIMER);
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootLayout />
      </MemoryRouter>,
    );

    const details = await screen.findByText(
      /Ver el aviso completo \(2 secciones\)/,
    );
    expect(details.tagName).toBe('SUMMARY');
    expect(details.closest('details')).not.toBeNull();
    expect(details.closest('details')).not.toHaveAttribute('open');

    // El contenido está en el DOM pero el details está plegado.
    expect(screen.getByText('Naturaleza del servicio')).toBeInTheDocument();
    expect(screen.getByText('Herramienta recreativa.')).toBeInTheDocument();
  });

  it('las secciones se ven al abrir el details', async () => {
    const user = userEvent.setup();
    vi.mocked(legalRepository.getDisclaimer).mockResolvedValue(DISCLAIMER);
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootLayout />
      </MemoryRouter>,
    );

    await user.click(await screen.findByText(/Ver el aviso completo/));

    const details = document.getElementById('legal-disclaimer')!.querySelector('details')!;
    expect(details).toHaveAttribute('open');
    expect(screen.getByText('Cálculo en el cliente')).toBeInTheDocument();
    expect(screen.getByText('Se calcula en el navegador.')).toBeInTheDocument();
  });

  it('no renderiza el pie si la petición falla', async () => {
    vi.mocked(legalRepository.getDisclaimer).mockRejectedValue(
      new ApiError(500, { message: 'Server error' }),
    );
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootLayout />
      </MemoryRouter>,
    );

    await waitFor(() => expect(legalRepository.getDisclaimer).toHaveBeenCalled());
    // La app sigue montada (header incluido), pero sin el pie.
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('la app no se bloquea mientras el disclaimer no llega', () => {
    // Promesa que nunca resuelve: el resto de la app ya está en pantalla.
    vi.mocked(legalRepository.getDisclaimer).mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});

describe('RootLayout — importación de invitado', () => {
  const GUEST_ENTRY: LocalHistoryEntry = {
    id: 'local-1',
    module: 'dice',
    description: 'd20 = 7',
    timestamp: '2026-10-20T12:00:00.000Z',
    synced: false,
    record: {
      module_name: 'dice',
      action: 'd20',
      payload: { sides: 20, modifier: 0 },
      result: { rolls: [7], modifier: 0, total: 7 },
    },
  };

  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, expiresAt: null });
    useHistoryStore.setState({
      entries: [],
      guestEntries: [],
      guestImportPending: false,
      guestImportError: null,
    });
    vi.mocked(legalRepository.getDisclaimer).mockResolvedValue(DISCLAIMER);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('abre el diálogo y permite elegir "Ahora no"', async () => {
    const { showModal, close } = mockNativeDialog();
    useHistoryStore.setState({
      guestEntries: [GUEST_ENTRY],
      guestImportPending: true,
    });
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootLayout />
      </MemoryRouter>,
    );

    const dialog = document.getElementById('guest-import-dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
    expect(showModal).toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Importar historial de invitado' }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Ahora no' }));

    await waitFor(() =>
      expect(useHistoryStore.getState().guestImportPending).toBe(false),
    );
    expect(close).toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });

  it('llama a importGuestHistory al confirmar', async () => {
    mockNativeDialog();
    const importSpy = vi
      .spyOn(useHistoryStore.getState(), 'importGuestHistory')
      .mockResolvedValue();
    useHistoryStore.setState({
      guestEntries: [GUEST_ENTRY],
      guestImportPending: true,
    });
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootLayout />
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Importar a mi cuenta' }),
    );

    expect(importSpy).toHaveBeenCalledTimes(1);
  });
});
