// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { NavLinkButton } from '../../../src/components/NavLinkButton';

function renderLink(to: string) {
  return render(
    <MemoryRouter initialEntries={['/teams']}>
      <NavLinkButton to={to}>Etiqueta</NavLinkButton>
    </MemoryRouter>,
  );
}

describe('NavLinkButton', () => {
  it('renderiza un <a> con la ruta y la clase nav-link', () => {
    renderLink('/teams');
    const link = screen.getByRole('link', { name: 'Etiqueta' });
    expect(link.getAttribute('href')).toBe('/teams');
    expect(link.className).toContain('nav-link');
  });

  it('resalta el enlace activo con superficie hundida y borde de acento', () => {
    renderLink('/teams');
    const link = screen.getByRole('link', { name: 'Etiqueta' });
    // La ruta actual es /teams, así que el enlace está activo.
    expect(link.className).toContain('bg-surface-sunken');
    expect(link.className).toContain('text-action');
    expect(link.className).toContain('border-action');
    expect(link.className).toContain('shadow-pressed');
    expect(link.className).not.toContain('bg-action');
  });

  it('no resalta el enlace cuando la ruta no es active', () => {
    renderLink('/roulette');
    const link = screen.getByRole('link', { name: 'Etiqueta' });
    // La ruta actual es /teams, no /roulette.
    expect(link.className).toContain('text-muted');
    expect(link.className).not.toContain('bg-action');
    expect(link.className).toContain('shadow-low');
  });
});
