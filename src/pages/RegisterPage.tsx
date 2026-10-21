// =============================================================================
// RegisterPage (/register)
//
// Form simple que llama `authStore.register`. Muestra errores de validación
// por campo si el backend devuelve 422.
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { useAuthStore, selectIsAuthenticated } from '../store/authStore';
import { ApiError } from '../domain/types';

export function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setError(null);
    try {
      await register({ name, email, password });
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError('Ocurrió un error inesperado. Probá de nuevo.');
      }
    }
  };

  return (
    <main className="p-6 w-full mx-auto">
      <section className="max-w-md mx-auto animate-fade-in flex flex-col gap-4">
        <h1 tabIndex={-1} className="font-bold">
          Registro
        </h1>

        <form
          onSubmit={onSubmit}
          aria-describedby={error ? 'register-error' : undefined}
          className="panel bg-surface rounded-2xl shadow-raised p-6 flex flex-col gap-4"
        >
          <Field
            label="Nombre"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            error={fieldErrors.name?.[0]}
          />
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
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            hint="Mínimo 8 caracteres."
            error={fieldErrors.password?.[0]}
          />
          {error ? (
            <p id="register-error" className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <PrimaryButton type="submit" variant="primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Creando cuenta…' : 'Crear cuenta'}
          </PrimaryButton>
        </form>

        <p className="text-sm text-muted text-center">
          ¿Ya tenés cuenta?{' '}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center text-action underline underline-offset-2 hover:text-action"
          >
            Iniciar sesión
          </Link>
        </p>
      </section>
    </main>
  );
}