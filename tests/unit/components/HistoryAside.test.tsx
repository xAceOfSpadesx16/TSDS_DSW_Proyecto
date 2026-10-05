// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocalHistoryEntry } from '../../../src/store/historyStore';
import { useHistoryStore } from '../../../src/store/historyStore';
import { HistoryAside } from '../../../src/components/HistoryAside';

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

afterEach(() => {
  cleanup();
  useHistoryStore.setState({ entries: [] });
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

    // La entrada no sincronizada muestra "solo local".
    const list = document.getElementById('history-list')!;
    const items = list.querySelectorAll('li');
    expect(items).toHaveLength(2);
    const unsynced = Array.from(items).find((li) =>
      li.textContent?.includes('Creación de equipos'),
    );
    expect(unsynced?.textContent).toContain('solo local');

    // (3.7.1) la marca temporal se renderiza HH:mm (dos dígitos).
    const rpgLi = Array.from(items).find((li) =>
      li.textContent?.includes('Tirada de dados'),
    )!;
    const timeText = rpgLi.querySelector('div')!.textContent ?? '';
    expect(timeText).toMatch(/(\d{2}:\d{2})/);

    // (3.7.2) el atributo title conserva la descripción completa (no truncada).
    const descSpan = rpgLi.querySelector('span.truncate')!;
    expect(descSpan.getAttribute('title')).toBe('Tirada de dados');

    // (3.7.3) una entrada sincronizada NO muestra el distintivo "solo local".
    expect(rpgLi.textContent).not.toContain('solo local');
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
