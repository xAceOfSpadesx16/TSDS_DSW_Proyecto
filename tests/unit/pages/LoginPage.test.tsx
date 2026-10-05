// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoginPage } from '../../../src/pages/LoginPage';
import { useAuthStore } from '../../../src/store/authStore';
import { createUserEvent, fillByLabel, resetAuthForTests } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';

const STORAGE_KEY = 'thrive_auth_v1';

function renderLogin() {
  installLocalStorage();
  resetAuthForTests();
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p data-testid="home">Inicio</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    installLocalStorage();
    resetAuthForTests();
  });

  afterEach(() => {
    cleanup();
    resetAuthForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renderiza los campos Email y Contraseña y el enlace a registro', () => {
    renderLogin();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    const register = screen.getByRole('link', { name: /Registrate/ });
    expect(register).toHaveAttribute('href', '/register');
  });

  it('inicia sesión y redirige a / al éxito', async () => {
    vi.stubGlobal('fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          user: { id: 1, name: 'Ada', email: 'ada@example.com' },
          token: 'session-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      }),
    );

    const user = createUserEvent();
    renderLogin();
    await fillByLabel(user, 'Email', 'ada@example.com');
    await fillByLabel(user, 'Contraseña', 's3cret');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByTestId('home')).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBe('session-token');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string).token).toBe('session-token');
  });

  it('despliega el error por campo ante un 422', async () => {
    vi.stubGlobal('fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'Error de validación',
          errors: { email: ['El correo electrónico es inválido.'] },
        }),
      }),
    );

    const user = createUserEvent();
    renderLogin();
    // Email válido para superar la validación del cliente: el 422 lo devuelve
    // el backend mockeado, no la validación local.
    await fillByLabel(user, 'Email', 'ada@example.com');
    await fillByLabel(user, 'Contraseña', 's3cret');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('El correo electrónico es inválido.')).toBeInTheDocument();
  });

  it('muestra una alerta global ante un 401 (credenciales inválidas)', async () => {
    vi.stubGlobal('fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'CREDENTIALS inválidas' }),
      }),
    );

    const user = createUserEvent();
    renderLogin();
    await fillByLabel(user, 'Email', 'ada@example.com');
    await fillByLabel(user, 'Contraseña', 'wrong');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('CREDENTIALS inválidas')).toBeInTheDocument();
  });

  it('muestra un error genérico cuando la petición de red falla', async () => {
    vi.stubGlobal('fetch',
      vi.fn().mockRejectedValue(new TypeError('Network failed')),
    );

    const user = createUserEvent();
    renderLogin();
    await fillByLabel(user, 'Email', 'ada@example.com');
    await fillByLabel(user, 'Contraseña', 's3cret');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Error desconocido.')).toBeInTheDocument();
  });

  it('muestra estado de carga (botón deshabilitado y "Entrando...") y luego completa', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    const pending = new Promise((r) => {
      resolveFetch = r;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending));

    const user = createUserEvent();
    renderLogin();
    await fillByLabel(user, 'Email', 'ada@example.com');
    await fillByLabel(user, 'Contraseña', 's3cret');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const loadingBtn = await screen.findByRole('button', { name: 'Entrando...' });
    expect(loadingBtn).toBeDisabled();

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 1, name: 'Ada', email: 'ada@example.com' },
        token: 'session-token',
        token_type: 'bearer',
        expires_in: 3600,
      }),
    });
    await waitFor(() => expect(screen.getByTestId('home')).toBeInTheDocument());
  });
});
