// =============================================================================
// LoginPage (/login)
//
// Form simple que llama `authStore.login`. Muestra errores de validación
// por campo si el backend devuelve 422 (ej: email no registrado).
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../domain/types';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setError(null);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError('Error desconocido.');
      }
    }
  };

  return (
    <main className="p-6 w-full mx-auto" role="main">
      <section className="max-w-md mx-auto animate-fade-in flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Iniciar sesión</h1>

        <form
          onSubmit={onSubmit}
          className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col gap-4"
        >
          <Field
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            error={fieldErrors.email?.[0]}
          />
          <Field
            label="Contraseña"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            error={fieldErrors.password?.[0]}
          />
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <PrimaryButton type="submit" variant="primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Entrando...' : 'Entrar'}
          </PrimaryButton>
        </form>

        <p className="text-sm text-light-muted text-center">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-primary-light hover:underline">
            Registrate
          </Link>
        </p>
      </section>
    </main>
  );
}