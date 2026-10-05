// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../../../src/components/Header';
import { useAuthStore } from '../../../src/store/authStore';
import { authRepository } from '../../../src/repositories/authRepository';

// El Header lee el auth store; el logout del store llama a authRepository.
// Lo mockeamos para no tocar la red.
vi.mock('../../../src/repositories/authRepository', () => ({
  authRepository: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    me: vi.fn(),
  },
}));

const authedUser = { id: 'u1', name: 'Ada', email: 'ada@example.com' };

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Header />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useAuthStore.setState({
    user: null,
    token: null,
    expiresAt: null,
    status: 'idle',
    error: null,
  });
});

describe('Header', () => {
  it('renderiza la marca y la navegación principal', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Thrive Randomizer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Equipos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sorteo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ruleta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dados' })).toBeInTheDocument();
  });

  it('muestra Entrar y Registro cuando no hay sesión', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registro' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument();
  });

  it('muestra el nombre de usuario y Salir cuando hay sesión', () => {
    useAuthStore.setState({ user: authedUser, token: 'jwt' });
    renderHeader();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('cierra sesión al pulsar Salir y vuelve al estado anónimo', async () => {
    useAuthStore.setState({ user: authedUser, token: 'jwt' });
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    // El logout limpia el estado: reaparece el estado de no autenticado.
    await screen.findByRole('link', { name: 'Entrar' });
    expect(screen.queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument();
  });
});
