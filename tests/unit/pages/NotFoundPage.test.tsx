// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { NotFoundPage } from '../../../src/pages/NotFoundPage';

describe('NotFoundPage', () => {
  it('muestra el código 404, el mensaje descriptivo y el enlace de regreso', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '404', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('La ruta solicitada no existe.')).toBeInTheDocument();

    const back = screen.getByRole('link', { name: 'Volver al inicio' });
    expect(back).toHaveAttribute('href', '/');
  });
});
