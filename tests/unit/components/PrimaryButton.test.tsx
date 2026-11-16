// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrimaryButton } from '../../../src/components/PrimaryButton';

afterEach(cleanup);

describe('PrimaryButton', () => {
  it('renderiza los niños y es un <button>', () => {
    render(<PrimaryButton>Guardar</PrimaryButton>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button.tagName).toBe('BUTTON');
  });

  it('aplica la variante primary por defecto', () => {
    const { container } = render(<PrimaryButton>Guardar</PrimaryButton>);
    const button = container.querySelector('button')!;
    expect(button.className).toContain('bg-action');
    expect(button.className).toContain('text-on-action');
  });

  it.each(['primary', 'ghost', 'accent', 'danger'] as const)(
    'apila los estilos base sobre la variante %s',
    (variant) => {
      const { container } = render(
        <PrimaryButton variant={variant}>Acción</PrimaryButton>,
      );
      const button = container.querySelector('button')!;
      // Estilos base siempre presentes.
      expect(button.className).toContain('px-4 py-2');
      expect(button.className).toContain('focus-visible:outline');
      // Clase distintiva de la variante.
      expect(button.className).toContain(
        variant === 'primary'
          ? 'bg-action'
          : variant === 'ghost'
            ? 'border-control'
            : variant === 'accent'
              ? 'bg-surface-sunken'
              : 'bg-danger',
      );
    },
  );

  it('el botón principal tiene relleno de acento y relieve neumórfico', () => {
    const { container } = render(<PrimaryButton>Generar</PrimaryButton>);
    const button = container.querySelector('button')!;
    expect(button.className).toContain('bg-action');
    expect(button.className).toContain('shadow-raised');
    expect(button.className).toContain('active:shadow-pressed');
  });

  it('el estado seleccionado se hunde y no usa relleno de acento', () => {
    const { container } = render(
      <PrimaryButton variant="accent">Seleccionado</PrimaryButton>,
    );
    const button = container.querySelector('button')!;
    expect(button.className).toContain('bg-surface-sunken');
    expect(button.className).toContain('text-action');
    expect(button.className).toContain('border-action');
    expect(button.className).toContain('shadow-pressed');
    expect(button.className).not.toContain('bg-action');
  });

  it('combina la className personalizada con la base', () => {
    const { container } = render(
      <PrimaryButton className="w-full">Guardar</PrimaryButton>,
    );
    const button = container.querySelector('button')!;
    expect(button.className).toContain('w-full');
    expect(button.className).toContain('px-4 py-2');
  });

  it('reenvía el handler de click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PrimaryButton onClick={onClick}>Guardar</PrimaryButton>);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('propaga el atributo disabled al botón', () => {
    render(<PrimaryButton disabled>Guardar</PrimaryButton>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('no ejecuta el handler al clicar cuando está deshabilitado', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PrimaryButton disabled onClick={onClick}>Guardar</PrimaryButton>,
    );
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('reenvía atributos nativos como el type', () => {
    render(<PrimaryButton type="submit">Enviar</PrimaryButton>);
    expect(screen.getByRole('button', { name: 'Enviar' }).getAttribute('type')).toBe(
      'submit',
    );
  });
});
