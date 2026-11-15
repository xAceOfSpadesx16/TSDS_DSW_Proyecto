// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AdSlot, type AdSlotVariant } from '../../../src/components/AdSlot';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const SIZES: Record<AdSlotVariant, { width: number; height: number }> = {
  tower: { width: 120, height: 600 },
  'tower-wide': { width: 160, height: 600 },
  rectangle: { width: 300, height: 250 },
  leaderboard: { width: 728, height: 90 },
  'mobile-banner': { width: 320, height: 100 },
};

describe('AdSlot — recuadro de reserva', () => {
  it('muestra un aside con nombre accesible y la etiqueta Publicidad', () => {
    render(<AdSlot variant="rectangle" />);

    const aside = screen.getByRole('complementary', { name: 'Publicidad' });
    expect(aside).toBeInTheDocument();
    expect(aside).toHaveAttribute('data-ad-variant', 'rectangle');
    expect(screen.getByText('Publicidad')).toBeVisible();
  });

  it('sin cliente configurado no renderiza el marcado de AdSense', () => {
    const { container } = render(<AdSlot variant="rectangle" />);

    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
    expect(
      container.querySelector('[data-ad-reserved]'),
    ).toHaveAttribute('data-ad-reserved', 'true');
  });

  it('reserva el tamaño exacto de cada variante', () => {
    for (const [variant, size] of Object.entries(SIZES) as Array<
      [AdSlotVariant, { width: number; height: number }]
    >) {
      const { container, unmount } = render(<AdSlot variant={variant} />);
      const frame = container.querySelector<HTMLElement>('.ad-slot-frame')!;

      expect(frame.style.width).toBe(`${size.width}px`);
      expect(frame.style.height).toBe(`${size.height}px`);
      unmount();
    }
  });

  it('no contiene elementos que reciban foco ni scripts', () => {
    const { container } = render(<AdSlot variant="tower" />);

    const focusable = container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]',
    );
    expect(focusable).toHaveLength(0);
    expect(container.querySelector('script')).toBeNull();
  });

  it('conserva la className recibida junto a las clases propias', () => {
    const { container } = render(
      <AdSlot variant="tower" className="hidden lg:block" />,
    );
    const aside = container.querySelector('aside')!;

    expect(aside.className).toContain('ad-slot');
    expect(aside.className).toContain('hidden');
    expect(aside.className).toContain('lg:block');
  });
});

describe('AdSlot — con cliente configurado', () => {
  it('renderiza ins.adsbygoogle con data-ad-client y data-ad-slot', () => {
    vi.stubEnv('VITE_ADSENSE_CLIENT', 'ca-pub-1234567890');

    const { container } = render(<AdSlot variant="rectangle" />);
    const ins = container.querySelector('ins.adsbygoogle');

    expect(ins).not.toBeNull();
    expect(ins).toHaveAttribute('data-ad-client', 'ca-pub-1234567890');
    expect(ins).toHaveAttribute('data-ad-slot', '1234567892');
    expect(ins?.getAttribute('style')).toContain('width: 300px');
    expect(ins?.getAttribute('style')).toContain('height: 250px');
  });

  it('marca el recuadro como no reservado cuando hay cliente', () => {
    vi.stubEnv('VITE_ADSENSE_CLIENT', 'ca-pub-1234567890');

    const { container } = render(<AdSlot variant="leaderboard" />);

    expect(
      container.querySelector('[data-ad-reserved]'),
    ).toHaveAttribute('data-ad-reserved', 'false');
    expect(screen.getByText('Publicidad')).toBeVisible();
  });

  it('ignora un cliente en blanco y vuelve al recuadro de reserva', () => {
    vi.stubEnv('VITE_ADSENSE_CLIENT', '   ');

    const { container } = render(<AdSlot variant="tower-wide" />);

    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
    expect(
      container.querySelector('[data-ad-reserved]'),
    ).toHaveAttribute('data-ad-reserved', 'true');
  });
});
