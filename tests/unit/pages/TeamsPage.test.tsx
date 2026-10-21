// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamsPage } from '../../../src/pages/TeamsPage';
import { useHistoryStore } from '../../../src/store/historyStore';
import { createUserEvent, fillByLabel } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';

const resetHistory = () => useHistoryStore.setState({ entries: [] });

function renderTeams() {
  return render(<TeamsPage />);
}

const generate = () => fireEvent.click(screen.getByRole('button', { name: 'Generar Equipos' }));

// Rellena el textarea de participantes (label estático, sin clamp).
const fillParticipants = async (value: string) => {
  const user = createUserEvent();
  await fillByLabel(user, 'Participantes (uno por línea)', value);
};

// Elige una persona en un select de exclusión (Persona A / Persona B).
const fillExclusion = async (which: 'a' | 'b', value: string) => {
  const user = createUserEvent();
  await user.selectOptions(
    screen.getByLabelText(which === 'a' ? 'Persona A' : 'Persona B'),
    value,
  );
};

describe('TeamsPage — participantes y modo', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    renderTeams();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renderiza el textarea de participantes, el toggle de modo y el campo de valor', () => {
    expect(screen.getByLabelText('Participantes (uno por línea)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cantidad de grupos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Tamaño de grupo' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(document.querySelector('#team-value')).toHaveAttribute('min', '2');
  });

  it('normaliza los participantes (recorta y descarta líneas vacías) al generar', async () => {
    await fillParticipants('  Ana\n Bruno\n\nCarla\n ');
    generate();

    await waitFor(() => expect(document.querySelector('#team-results')).toBeInTheDocument());
    // 3 participantes normalizados → 2 equipos (modo cantidad, valor por defecto 2).
    expect(useHistoryStore.getState().entries[0].description).toMatch(
      /^3 participantes → 2 equipos$/,
    );
  });

  it('cambia de modo: aria-pressed, label y mínimo ajustados', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Tamaño de grupo' }));
    expect(screen.getByRole('button', { name: 'Tamaño de grupo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Cantidad de grupos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(document.querySelector('#team-value')).toHaveAttribute('min', '1');
  });
});

describe('TeamsPage — exclusiones', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    renderTeams();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('ofrece solo participantes en los selects de exclusión, sin texto libre', async () => {
    await fillParticipants('Ana\nBruno\nCarla');

    expect(
      screen.getByRole('group', { name: 'Modo de reparto' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Agregar exclusión' }),
    ).toBeInTheDocument();

    const selectA = screen.getByLabelText('Persona A') as HTMLSelectElement;
    const selectB = screen.getByLabelText('Persona B') as HTMLSelectElement;
    expect(Array.from(selectA.options).map((option) => option.value)).toEqual([
      '',
      'Ana',
      'Bruno',
      'Carla',
    ]);
    expect(Array.from(selectB.options).map((option) => option.value)).toEqual([
      '',
      'Ana',
      'Bruno',
      'Carla',
    ]);
    expect(screen.queryByRole('textbox', { name: 'Persona A' })).not.toBeInTheDocument();
  });

  it('agrega y elimina un par de exclusiones', async () => {
    await fillParticipants('Juan\nPedro');
    await fillExclusion('a', 'Juan');
    await fillExclusion('b', 'Pedro');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(screen.getByText('Juan ↔ Pedro')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar exclusión Juan Pedro' }));
    expect(screen.queryByText('Juan ↔ Pedro')).not.toBeInTheDocument();
  });

  it('no agrega una exclusión con campos vacíos o iguales', async () => {
    await fillParticipants('Juan\nPedro');

    // Iguales.
    await fillExclusion('a', 'Juan');
    await fillExclusion('b', 'Juan');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.queryByText('Juan ↔ Juan')).not.toBeInTheDocument();

    // Vacía.
    await fillExclusion('a', '');
    await fillExclusion('b', '');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.queryByText('↔')).not.toBeInTheDocument();
  });

  it('elimina las exclusiones que incluyen a un participante que se quita', async () => {
    await fillParticipants('Ana\nBruno\nCarla');
    await fillExclusion('a', 'Ana');
    await fillExclusion('b', 'Bruno');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByText('Ana ↔ Bruno')).toBeInTheDocument();

    await fillParticipants('Ana\nCarla');
    expect(screen.queryByText('Ana ↔ Bruno')).not.toBeInTheDocument();
  });

  it('respeta una exclusión colocando a las dos personas en equipos distintos', async () => {
    await fillParticipants('Ana\nBruno\nCarla\nDiego\nJuan\nPedro');
    fireEvent.click(screen.getByRole('button', { name: 'Cantidad de grupos' }));
    await fillExclusion('a', 'Juan');
    await fillExclusion('b', 'Pedro');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    generate();

    await waitFor(() => expect(document.querySelector('#team-results')).toBeInTheDocument());

    expect(
      screen.getByRole('heading', { name: 'Resultados', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Equipo 1', level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Equipo 2', level: 3 }),
    ).toBeInTheDocument();

    const cards = Array.from(document.querySelectorAll('#team-results > div'));
    expect(cards).toHaveLength(2);
    const teamMembers = cards.map((c) =>
      Array.from(c.querySelectorAll('li')).map((li) => li.textContent),
    );
    const juanTeam = teamMembers.findIndex((m) => m.includes('Juan'));
    const pedroTeam = teamMembers.findIndex((m) => m.includes('Pedro'));
    expect(juanTeam).not.toBe(pedroTeam);
  });

  it('restaura participantes, modo, valor y exclusiones, y los restablece', async () => {
    cleanup();
    const user = createUserEvent();
    const first = renderTeams();
    await fillParticipants('Ana\nBruno\nCarla');
    await fillExclusion('a', 'Ana');
    await fillExclusion('b', 'Bruno');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tamaño de grupo' }));
    await fillByLabel(user, 'Tamaño de grupo', '3');

    first.unmount();
    renderTeams();

    expect(screen.getByLabelText('Participantes (uno por línea)')).toHaveValue(
      'Ana\nBruno\nCarla',
    );
    expect(screen.getByText('Ana ↔ Bruno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tamaño de grupo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Tamaño de grupo')).toHaveValue(3);

    const userAfterReload = createUserEvent();
    await userAfterReload.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(screen.getByLabelText('Participantes (uno por línea)')).toHaveValue('');
    expect(screen.queryByText('Ana ↔ Bruno')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cantidad de grupos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Cantidad de grupos')).toHaveValue(2);
  });
});

describe('TeamsPage — generación y errores', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
    renderTeams();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('genera equipos con tarjetas de color y lo registra en el historial', async () => {
    await fillParticipants('Ana\nBruno\nCarla\nDiego');
    generate();

    await waitFor(() => expect(document.querySelector('#team-results')).toBeInTheDocument());

    const cards = Array.from(document.querySelectorAll('#team-results > div'));
    expect(cards).toHaveLength(2);
    // Cada tarjeta tiene borde de color distinto y un encabezado "Equipo N".
    const colors = cards.map((c) => getComputedStyle(c).borderLeftColor);
    expect(colors[0]).not.toBe('');
    expect(colors[0]).not.toBe(colors[1]);
    expect(screen.getByText('Equipo 1')).toBeInTheDocument();
    expect(screen.getByText('Equipo 2')).toBeInTheDocument();

    expect(useHistoryStore.getState().entries[0].description).toBe('4 participantes → 2 equipos');
  });

  it('muestra un error si hay menos de 2 participantes', async () => {
    await fillParticipants('Ana');
    generate();
    expect(screen.getByRole('alert')).toHaveTextContent('al menos 2 participantes');
  });

  it('muestra un error si la cantidad de grupos supera los participantes', async () => {
    await fillParticipants('Ana\nBruno');
    generate(); // 2 grupos por defecto -> OK
    // Ahora pedimos 5 grupos con 2 participantes.
    // El campo "Cantidad de grupos" tiene clamp (mín. 2) que mapea "" → 2; se fija el valor.
    fireEvent.change(screen.getByLabelText('Cantidad de grupos') as HTMLInputElement, {
      target: { value: '5' },
    });
    generate();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pueden formar 5 grupos');
  });
});

describe('TeamsPage — restricciones imposibles', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('muestra el error, no muestra resultados y no registra historial', async () => {
    // El espía se instala antes del render para que el componente capture la
    // versión espiada de `add`.
    const addSpy = vi.spyOn(useHistoryStore.getState(), 'add');
    render(<TeamsPage />);

    await fillParticipants('Ana\nBruno\nCarla');
    // Tres personas mutuamente excluidas en dos grupos: imposible.
    await fillExclusion('a', 'Ana');
    await fillExclusion('b', 'Bruno');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await fillExclusion('a', 'Ana');
    await fillExclusion('b', 'Carla');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await fillExclusion('a', 'Bruno');
    await fillExclusion('b', 'Carla');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    generate();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /No se pueden cumplir las restricciones/,
      ),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Ana ↔ Bruno');
    expect(document.querySelector('#team-form')).toHaveAttribute(
      'aria-describedby',
      'teams-error',
    );
    expect(document.querySelector('#team-results')).not.toBeInTheDocument();
    expect(addSpy).not.toHaveBeenCalled();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });
});
