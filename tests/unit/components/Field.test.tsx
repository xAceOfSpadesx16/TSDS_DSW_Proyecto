// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from '../../../src/components/Field';

describe('Field', () => {
  it('renderiza el label asociado al input', () => {
    const { container } = render(<Field label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    // El input está envuelto por el <label> (asociación nativa de accesibilidad).
    expect(input?.closest('label')).toBeInTheDocument();
  });

  it('propaga el id y atributos del input al elemento nativo', () => {
    const { container } = render(<Field label="Email" id="user-email" type="email" required />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.id).toBe('user-email');
    expect(input.type).toBe('email');
    expect(input).toBeRequired();
  });

  it('muestra el hint cuando se proporciona', () => {
    render(<Field label="Email" hint="Nunca lo compartimos" />);
    expect(screen.getByText('Nunca lo compartimos')).toBeInTheDocument();
  });

  it('no renderiza el hint cuando no se proporciona', () => {
    render(<Field label="Email" />);
    expect(screen.queryByText(/Nunca/)).not.toBeInTheDocument();
  });

  it('expresa el error como alerta y marca el input como inválido', () => {
    render(<Field label="Email" error="Requerido" />);
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Requerido');
  });

  it('no expresa alerta cuando no hay error', () => {
    render(<Field label="Email" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('dispara el handler de cambios del input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Field label="Email" onChange={onChange} />);
    await user.type(container.querySelector('input') as HTMLInputElement, 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
