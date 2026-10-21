// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { LandingPage } from '../../../src/pages/LandingPage';

const MODULES: Array<{ title: RegExp; href: string }> = [
  { title: /Generador de Equipos/, href: '/teams' },
  { title: /Sorteo con Pesos/, href: '/weighted' },
  { title: /Ruleta de Decisiones/, href: '/roulette' },
  { title: /Dados RPG/, href: '/dice' },
  { title: /Números Aleatorios/, href: '/numbers' },
];

describe('LandingPage', () => {
  const renderLanding = () =>
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

  it('renderiza el hero (título, subtítulo y descripción de la suite)', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { name: 'Thrive Randomizer', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Suite de herramientas de aleatorización/),
    ).toBeInTheDocument();
  });

  it('tiene un llamado principal que lleva a los módulos', () => {
    renderLanding();
    const cta = screen.getByRole('link', { name: 'Empezar a sortear' });
    expect(cta).toHaveAttribute('href', '#modulos');
  });

  it('renderiza las 5 tarjetas de módulos con título, ícono y destino correctos', () => {
    renderLanding();
    for (const { title, href } of MODULES) {
      const card = screen.getByRole('link', { name: title });
      expect(card).toHaveAttribute('href', href);
    }
    // Las 5 cards están presentes.
    expect(
      screen.getAllByRole('link', {
        name: /Generador de Equipos|Sorteo con Pesos|Ruleta de Decisiones|Dados RPG|Números Aleatorios/,
      }),
    ).toHaveLength(5);
  });

  it('no renderiza el panel de historial en esta vista', () => {
    renderLanding();
    expect(screen.queryByLabelText('Historial de operaciones')).not.toBeInTheDocument();
    expect(document.querySelector('#history-aside')).toBeNull();
  });
});
