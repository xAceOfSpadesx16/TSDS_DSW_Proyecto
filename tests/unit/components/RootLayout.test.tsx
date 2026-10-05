// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { RootLayout } from '../../../src/components/RootLayout';

describe('RootLayout', () => {
  it('renderiza el Header y el Outlet de las rutas hijas', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route path="dashboard" element={<h1>Dashboard</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Estructura común: el Header está presente en todas las páginas.
    expect(screen.getByRole('link', { name: 'Thrive Randomizer' })).toBeInTheDocument();
    // El Outlet renderiza el contenido de la ruta hija.
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renderiza el Header aunque no haya ruta hija que coincida', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route path="dashboard" element={<h1>Dashboard</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Thrive Randomizer' })).toBeInTheDocument();
    // No coincide ninguna ruta hija, así que el Outlet queda vacío.
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
