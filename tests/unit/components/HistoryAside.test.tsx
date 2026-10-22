// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { LocalHistoryEntry } from '../../../src/store/historyStore';
import { useHistoryStore } from '../../../src/store/historyStore';
import { HistoryAside } from '../../../src/components/HistoryAside';
import { ApiError, type CreateHistoryPayload } from '../../../src/domain/types';
import { useAuthStore } from '../../../src/store/authStore';
import { historyRepository } from '../../../src/repositories/historyRepository';
import { installLocalStorage } from '../helpers/localStorageMock';

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

function record(
  module: CreateHistoryPayload['module_name'],
  payload: CreateHistoryPayload['payload'],
  result: CreateHistoryPayload['result'],
  action = 'Sorteo',
): CreateHistoryPayload {
  return { module_name: module, action, payload, result } as CreateHistoryPayload;
}

function entryWithRecord(
  id: string,
  module: CreateHistoryPayload['module_name'],
  payload: CreateHistoryPayload['payload'],
  result: CreateHistoryPayload['result'],
  timestamp = '2026-10-20T15:00:00.000Z',
): LocalHistoryEntry {
  return {
    id,
    module,
    description: 'descripción',
    timestamp,
    synced: true,
    record: record(module, payload, result),
  };
}

async function renderOpen() {
  const user = userEvent.setup();
  render(<HistoryAside />);
  await user.click(screen.getByRole('button', { name: 'Mostrar historial' }));
  return user;
}

beforeEach(() => {
  installLocalStorage();
  // Sin sesión por defecto: el panel no toca el backend y "cargar más" queda
  // oculto. Los tests que necesitan lo contrario lo activan explícitamente.
  useAuthStore.setState({ user: null, token: null, expiresAt: null });
  useHistoryStore.setState({
    entries: [],
    guestEntries: [],
    currentPage: 1,
    lastPage: 1,
    loading: false,
    error: null,
  });
  vi.mocked(historyRepository.remove).mockReset();
  vi.mocked(historyRepository.clearAll).mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HistoryAside — disclosure', () => {
  it('arranca colapsado y alterna aria-expanded y visibilidad', async () => {
    const user = userEvent.setup();
    render(<HistoryAside />);

    const toggle = screen.getByRole('button', { name: 'Mostrar historial' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveClass('min-h-11', 'min-w-11');
    expect(screen.queryByText('Sin operaciones registradas.')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Sin operaciones registradas.')).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Sin operaciones registradas.')).not.toBeInTheDocument();
  });

  it('recuerda el estado abierto después de remontar', async () => {
    const user = userEvent.setup();
    const first = render(<HistoryAside />);
    await user.click(screen.getByRole('button', { name: 'Mostrar historial' }));
    first.unmount();

    render(<HistoryAside />);
    expect(
      screen.getByRole('button', { name: 'Ocultar historial' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Sin operaciones registradas.')).toBeInTheDocument();
  });
});

describe('HistoryAside (sidebar)', () => {
  it('muestra el estado vacío al abrir cuando no hay operaciones', async () => {
    await renderOpen();
    expect(screen.getByText('Sin operaciones registradas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument();
  });

  it('lista las operaciones con módulo, fecha, hora y estado de sync', async () => {
    useHistoryStore.setState({ entries });
    await renderOpen();

    expect(screen.getByText('Dados')).toBeInTheDocument();
    expect(screen.getByText('Equipos')).toBeInTheDocument();
    expect(screen.getByText('Tirada de dados')).toBeInTheDocument();
    expect(screen.getByText('Creación de equipos')).toBeInTheDocument();

    const items = document.querySelectorAll<HTMLElement>('[data-history-entry]');
    expect(items).toHaveLength(2);
    const unsynced = Array.from(items).find((item) =>
      item.textContent?.includes('Creación de equipos'),
    );
    expect(unsynced?.textContent).toContain('Guardado en este navegador');

    const rpg = Array.from(items).find((item) =>
      item.textContent?.includes('Tirada de dados'),
    )!;
    const time = rpg.querySelector('time')!;
    expect(time).toHaveAttribute('datetime', '2026-09-08T10:00:00.000Z');
    expect(time.textContent).toMatch(/\d{1,2}:\d{2}/);
    expect(rpg.querySelector('span[title]')).toHaveAttribute(
      'title',
      'Tirada de dados',
    );

    // Una entrada sincronizada no muestra el distintivo local.
    expect(rpg.textContent).not.toContain('Guardado en este navegador');
  });

  it('omite datetime cuando el timestamp es inválido', async () => {
    useHistoryStore.setState({
      entries: [{ ...entries[0], timestamp: 'no-es-fecha' }],
    });
    await renderOpen();

    const entryTime = document.querySelector('[data-history-entry] time');
    expect(entryTime).not.toHaveAttribute('datetime');
  });

  it('agrupa por día con encabezados Hoy y Ayer', async () => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(10, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(10, 0, 0, 0);

    useHistoryStore.setState({
      entries: [
        { ...entries[0], id: 'today', timestamp: today.toISOString() },
        { ...entries[0], id: 'yesterday', timestamp: yesterday.toISOString() },
      ],
    });
    await renderOpen();

    expect(screen.getByRole('heading', { name: 'Hoy', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ayer', level: 3 })).toBeInTheDocument();
    const times = document.querySelectorAll('#history-list time[datetime]');
    expect(times.length).toBeGreaterThanOrEqual(4); // 2 encabezados + 2 entradas
  });

  it('muestra el resultado real de los cinco módulos', async () => {
    useHistoryStore.setState({
      entries: [
        entryWithRecord(
          'dice',
          'dice',
          { sides: 6, modifier: 3, count: 2 },
          { rolls: [3, 5], total: 11, modifier: 3 },
        ),
        entryWithRecord(
          'numbers',
          'numbers',
          { count: 3, min: 1, max: 10, unique: true },
          { numbers: [3, 7, 9] },
        ),
        entryWithRecord(
          'roulette',
          'roulette',
          { options: [{ label: 'Pizza', color: '#6c5ce7' }] },
          { winner: { label: 'Pizza', color: '#6c5ce7' } },
        ),
        entryWithRecord(
          'teams',
          'teams',
          { participants: ['Ana', 'Bruno', 'Carla'], mode: 'count', value: 2 },
          {
            teams: [
              ['Ana', 'Bruno'],
              ['Carla'],
            ],
            colors: ['#6c5ce7', '#00cec9'],
          },
        ),
        entryWithRecord(
          'weighted',
          'weighted',
          { entries: [{ name: 'Ana', weight: 3 }] },
          { winner: { name: 'Ana', weight: 3 }, probability: 60 },
        ),
      ],
    });
    await renderOpen();

    expect(screen.getByText('Tiradas: 3, 5 · Total: 11 (+3)')).toBeInTheDocument();
    expect(screen.getByText('Números: 3, 7, 9')).toBeInTheDocument();
    expect(screen.getByText('Ganador: Pizza')).toBeInTheDocument();
    expect(screen.getByText('2 equipos · 3 integrantes')).toBeInTheDocument();
    expect(screen.getByText('Ganador: Ana · 60%')).toBeInTheDocument();
    expect(screen.getByText('Ver integrantes').closest('details')).not.toBeNull();
    expect(screen.getByText('Ver integrantes').closest('summary')).toHaveClass(
      'min-h-11',
    );
    expect(screen.getByText(/Ana, Bruno/)).toBeInTheDocument();
  });

  it('el borrado tiene nombre accesible y objetivo de 44×44', async () => {
    useHistoryStore.setState({ entries: [entries[0]] });
    await renderOpen();

    const deleteButton = screen.getByRole('button', {
      name: /Borrar Tirada de dados/,
    });
    expect(deleteButton).toHaveClass('h-11', 'w-11');
  });

  it('muestra el botón Limpiar y vacía la lista al pulsarlo', async () => {
    useHistoryStore.setState({ entries });
    const user = await renderOpen();

    const clearBtn = screen.getByRole('button', { name: 'Limpiar' });
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(screen.getByText('Sin operaciones registradas.')).toBeInTheDocument();
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

    const user = await renderOpen();
    await user.click(screen.getByRole('button', { name: /Borrar Tirada de dados/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo borrar el registro.',
    );
    expect(useHistoryStore.getState().entries).toHaveLength(1);
    expect(screen.getByText('Tirada de dados')).toBeInTheDocument();
  });

  it('un borrado con error de red nombra la operación que falló', async () => {
    useAuthStore.setState({
      user: { id: 1, name: 'Ada', email: 'ada@example.com' },
      token: 'jwt',
    });
    useHistoryStore.setState({
      entries: [{ ...entries[0], synced: true }],
      error: null,
    });
    vi.mocked(historyRepository.remove).mockRejectedValue(
      new TypeError('Failed to fetch'),
    );

    const user = await renderOpen();
    await user.click(screen.getByRole('button', { name: /Borrar Tirada de dados/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo borrar el registro.');
    expect(useHistoryStore.getState().entries).toHaveLength(1);
  });

  it('el mensaje se limpia al empezar la siguiente operación', async () => {
    useHistoryStore.setState({ entries, error: 'Error viejo' });
    const user = await renderOpen();

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
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
