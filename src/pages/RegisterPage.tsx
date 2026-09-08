// =============================================================================
// RegisterPage (/register)
//
// Form simple que llama `authStore.register`. Muestra errores de validación
// por campo si el backend devuelve 422.
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PrimaryButton } from '../components/PrimaryButton';
import { Field } from '../components/Field';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../domain/types';

export function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

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
        setError('Error desconocido.');
      }
    }
  };

  return (
    <main className="p-6 w-full mx-auto" role="main">
      <section className="max-w-md mx-auto animate-fade-in flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Registro</h1>

        <form
          onSubmit={onSubmit}
          className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col gap-4"
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
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <PrimaryButton type="submit" variant="primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Creando cuenta...' : 'Crear cuenta'}
          </PrimaryButton>
        </form>

        <p className="text-sm text-light-muted text-center">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-primary-light hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </section>
    </main>
  );
}