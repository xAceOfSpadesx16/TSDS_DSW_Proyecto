// @vitest-environment jsdom
// =============================================================================
// RegisterPage — tests de integración (registro de cuenta).
//
// Verifican el flujo real del componente: renderizado, envío con datos válidos
// (llamada a `authRepository.register` + redirección al home), bloqueo por
// validación nativa (`required`), y los dos caminos de error: ApiError del
// backend y fallo genérico ("Error desconocido.").
// =============================================================================

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../src/domain/types';
import { RegisterPage } from '../../../src/pages/RegisterPage';
import { authRepository } from '../../../src/repositories/authRepository';
import { createUserEvent, fillByLabel, resetAuthForTests } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';

// Monta RegisterPage dentro de un router con las rutas hermanas (/login, /)
// para poder probar redirecciones (registro exitoso → home, link → login).
function renderRegister(): void {
  installLocalStorage();
  resetAuthForTests();
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<p data-testid="login">Login</p>} />
        <Route path="/" element={<p data-testid="home">Home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    installLocalStorage();
    vi.spyOn(authRepository, 'register').mockResolvedValue({
      user: { id: 1, name: 'Test' },
      token: 'test-token',
      expires_in: 3600,
      token_type: 'bearer',
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renderiza el formulario de registro', () => {
    renderRegister();

    expect(screen.getByRole('heading', { name: 'Registro' })).toBeTruthy();
    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
    expect(screen.getByText('Crear cuenta')).toBeTruthy();
  });

  it('envía el formulario con datos válidos, llama al registro y redirige al home', async () => {
    const user = createUserEvent();
    renderRegister();

    await fillByLabel(user, 'Nombre', 'Test');
    await fillByLabel(user, 'Email', 'test@example.com');
    await fillByLabel(user, 'Contraseña', 'Password123!');

    await user.click(screen.getByText('Crear cuenta'));

    expect(authRepository.register).toHaveBeenCalledWith({
      name: 'Test',
      email: 'test@example.com',
      password: 'Password123!',
    });
    expect(window.localStorage.getItem('thrive_auth_v1')).toContain('test-token');
    expect(await screen.findByTestId('home')).toBeTruthy();
  });

  it('no envía el formulario con campos vacíos (validación nativa required)', async () => {
    const user = createUserEvent();
    renderRegister();

    await user.click(screen.getByText('Crear cuenta'));

    expect(authRepository.register).not.toHaveBeenCalled();
  });

  it('muestra el error devuelto por el backend (ApiError) y el error de campo', async () => {
    const user = createUserEvent();
    vi.spyOn(authRepository, 'register').mockRejectedValue(
      new ApiError(422, {
        message: 'Email ya registrado',
        errors: { email: ['Email ya registrado'] },
      }),
    );
    resetAuthForTests();
    renderRegister();

    await fillByLabel(user, 'Nombre', 'Test');
    await fillByLabel(user, 'Email', 'test@example.com');
    await fillByLabel(user, 'Contraseña', 'Password123!');

    await user.click(screen.getByText('Crear cuenta'));

    // El mensaje aparece tanto en el alert general como en el error del campo.
    expect(await screen.findAllByText('Email ya registrado')).toHaveLength(2);
  });

  it('muestra "Error desconocido." cuando el registro falla sin ser ApiError', async () => {
    const user = createUserEvent();
    vi.spyOn(authRepository, 'register').mockRejectedValue(new Error('caída del servidor'));
    resetAuthForTests();
    renderRegister();

    await fillByLabel(user, 'Nombre', 'Test');
    await fillByLabel(user, 'Email', 'test@example.com');
    await fillByLabel(user, 'Contraseña', 'Password123!');

    await user.click(screen.getByText('Crear cuenta'));

    expect(await screen.findByText('Error desconocido.')).toBeTruthy();
  });

  it('redirige al login al hacer clic en "Iniciar sesión"', async () => {
    const user = createUserEvent();
    renderRegister();

    await user.click(screen.getByText('Iniciar sesión'));

    expect(await screen.findByTestId('login')).toBeTruthy();
  });
});
