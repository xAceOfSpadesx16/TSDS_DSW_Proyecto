// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocalHistoryEntry } from '../../../src/store/historyStore';
import { useHistoryStore } from '../../../src/store/historyStore';
import { HistoryAside } from '../../../src/components/HistoryAside';
import { ApiError } from '../../../src/domain/types';
import { useAuthStore } from '../../../src/store/authStore';
import { historyRepository } from '../../../src/repositories/historyRepository';

// El store llama al backend cuando hay sesión; estos tests cubren el panel
// sin red, así que se mockea el repositorio completo.
vi.mock('../../../src/repositories/historyRepository', () => ({
  historyRepository: {
    create: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    clearAll: vi.fn(),
  },
}));

const entries: LocalHistoryEntry[] = [
  {
    id: '1',
    module: 'dice',
    description: 'Tirada de dados',
    timestamp: '2026-09-08T10:00:00.000Z',
    synced: true,
  },
  {
    id: '2',
    module: 'teams',
    description: 'Creación de equipos',
    timestamp: '2026-09-08T11:30:00.000Z',
    synced: false,
  },
];

beforeEach(() => {
  // Sin sesión por defecto: el panel no toca el backend y "cargar más" queda
  // oculto. Los tests que necesitan lo contrario lo activan explícitamente.
  useAuthStore.setState({ user: null, token: null, expiresAt: null });
  useHistoryStore.setState({
    entries: [],
    currentPage: 1,
    lastPage: 1,
    loading: false,
    error: null,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HistoryAside (sidebar)', () => {
  it('muestra el estado vacío cuando no hay operaciones', () => {
    render(<HistoryAside />);
    expect(
      screen.getByText('Sin operaciones registradas.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument();
  });

  it('lista las operaciones con su módulo, descripción y estado de sync', () => {
    useHistoryStore.setState({ entries });
    render(<HistoryAside />);

    expect(screen.getByText('Dados')).toBeInTheDocument();
    expect(screen.getByText('Equipos')).toBeInTheDocument();
    expect(screen.getByText('Tirada de dados')).toBeInTheDocument();
    expect(screen.getByText('Creación de equipos')).toBeInTheDocument();

    // La entrada no sincronizada muestra que quedó guardada en el navegador.
    const list = document.getElementById('history-list')!;
    const items = list.querySelectorAll('li');
    expect(items).toHaveLength(2);
    const unsynced = Array.from(items).find((li) =>
      li.textContent?.includes('Creación de equipos'),
    );
    expect(unsynced?.textContent).toContain('Guardado en este navegador');

    // (3.7.1) la marca temporal se renderiza HH:mm (dos dígitos).
    const rpgLi = Array.from(items).find((li) =>
      li.textContent?.includes('Tirada de dados'),
    )!;
    const timeText = rpgLi.querySelector('div')!.textContent ?? '';
    expect(timeText).toMatch(/(\d{2}:\d{2})/);

    // (3.7.2) el atributo title conserva la descripción completa (no truncada).
    const descSpan = rpgLi.querySelector('span.truncate')!;
    expect(descSpan.getAttribute('title')).toBe('Tirada de dados');

    // (3.7.3) una entrada sincronizada NO muestra el distintivo local.
    expect(rpgLi.textContent).not.toContain('Guardado en este navegador');
  });

  it('muestra el botón Limpiar y vacía la lista al pulsarlo', async () => {
    useHistoryStore.setState({ entries });
    const user = userEvent.setup();
    render(<HistoryAside />);

    const clearBtn = screen.getByRole('button', { name: 'Limpiar' });
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(
      screen.getByText('Sin operaciones registradas.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument();
  });
});

describe('HistoryAside — errores', () => {
  it('muestra el mensaje del store con role="alert"', () => {
    useHistoryStore.setState({ error: 'No se pudo cargar el historial.' });
    render(<HistoryAside />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No se pudo cargar el historial.');
  });

  it('un borrado fallido muestra el mensaje y no quita la entrada', async () => {
    // Sesión activa para que `remove` intente borrar en el backend.
    useAuthStore.setState({
      user: { id: 1, name: 'Ada', email: 'ada@example.com' },
      token: 'jwt',
    });
    useHistoryStore.setState({
      entries: [{ ...entries[0], synced: true }],
      error: null,
    });
    vi.mocked(historyRepository.remove).mockRejectedValue(
      new ApiError(500, { message: 'No se pudo borrar el registro.' }),
    );

    const user = userEvent.setup();
    render(<HistoryAside />);

    await user.click(screen.getByRole('button', { name: /Borrar Tirada de dados/ }));

    // El mensaje del backend queda visible...
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo borrar el registro.',
    );
    // ...y la entrada sigue en la lista, porque el backend no la borró.
    expect(useHistoryStore.getState().entries).toHaveLength(1);
    expect(screen.getByText('Tirada de dados')).toBeInTheDocument();
  });

  it('un borrado con error de red nombra la operación que falló', async () => {
    // Sesión activa para que `remove` intente borrar en el backend.
    useAuthStore.setState({
      user: { id: 1, name: 'Ada', email: 'ada@example.com' },
      token: 'jwt',
    });
    useHistoryStore.setState({
      entries: [{ ...entries[0], synced: true }],
      error: null,
    });
    // Fallo de red: no es `ApiError`, así que no hay mensaje del backend.
    vi.mocked(historyRepository.remove).mockRejectedValue(new TypeError('Failed to fetch'));

    const user = userEvent.setup();
    render(<HistoryAside />);

    await user.click(screen.getByRole('button', { name: /Borrar Tirada de dados/ }));

    // El mensaje nombra la operación (borrar), no un texto genérico.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo borrar el registro.');
    // Y la entrada sigue en la lista.
    expect(useHistoryStore.getState().entries).toHaveLength(1);
  });

  it('el mensaje se limpia al empezar la siguiente operación', async () => {
    useHistoryStore.setState({ entries, error: 'Error viejo' });
    const user = userEvent.setup();
    render(<HistoryAside />);

    expect(screen.getByRole('alert')).toHaveTextContent('Error viejo');

    await user.click(screen.getByRole('button', { name: /Borrar Creación de equipos/ }));

    expect(useHistoryStore.getState().error).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('HistoryAside (mobile)', () => {
  it('alterna la visibilidad del panel mediante el botón toggle', async () => {
    const user = userEvent.setup();
    render(<HistoryAside variant="mobile" />);

    const toggle = screen.getByRole('button', { name: 'Historial' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
