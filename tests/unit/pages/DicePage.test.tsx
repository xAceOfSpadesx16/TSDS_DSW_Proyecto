// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DicePage } from '../../../src/pages/DicePage';
import { diceStrategy } from '../../../src/strategies/DiceStrategy';
import { useHistoryStore } from '../../../src/store/historyStore';
import { createUserEvent, fillByLabel } from '../helpers/pageUtils';
import { installLocalStorage } from '../helpers/localStorageMock';
import { mockRequestAnimationFrame } from '../helpers/domMocks';

const resetHistory = () => useHistoryStore.setState({ entries: [] });

function renderDice() {
  return render(<DicePage />);
}

const rollDice = (sides: number) => {
  fireEvent.click(screen.getByRole('button', { name: `d${sides}` }));
};

describe('DicePage — dados', () => {
  beforeEach(() => {
    installLocalStorage();
    resetHistory();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renderiza los 5 dados, el campo modificador y el resultado', () => {
    renderDice();
    for (const sides of [4, 6, 8, 12, 20]) {
      expect(screen.getByRole('button', { name: `d${sides}` })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Modificador')).toBeInTheDocument();
    // Antes de la primera tirada no se anuncia ni se muestra una cara.
    const face = document.querySelector('#dice-result');
    expect(face).toHaveAttribute('aria-hidden', 'true');
    expect(face?.textContent).toBe('');
    expect(screen.getByRole('group', { name: 'Dado' })).toBeInTheDocument();
  });

  it('no renderiza la pestaña Números ni un tablist', () => {
    renderDice();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Números' })).not.toBeInTheDocument();
  });

  it('tira un d20+3, muestra el total y registra el sorteo en el historial', async () => {
    mockRequestAnimationFrame();
    const user = createUserEvent();
    renderDice();
    await fillByLabel(user, 'Modificador', '3');
    rollDice(20);

    // El resultado commitado está en [1+3, 20+3] = [4, 23].
    await waitFor(() => expect(document.querySelector('#dice-total')).toBeInTheDocument());
    const totalText = document.querySelector('#dice-total')!.textContent!;
    const total = parseInt(totalText.match(/(\d+)/)?.[1] ?? '0', 10);
    expect(total).toBeGreaterThanOrEqual(4);
    expect(total).toBeLessThanOrEqual(23);

    const entries = useHistoryStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].module).toBe('dice');
    expect(entries[0].description).toMatch(/^d20\+3 = \d+$/);
    expect(entries[0].synced).toBe(false);
  });

  it('anuncia solo el total final en la región viva', async () => {
    mockRequestAnimationFrame();
    renderDice();
    rollDice(6);

    await waitFor(() =>
      expect(document.querySelector('#dice-announcement')).toHaveTextContent(
        /^Total: \d+$/,
      ),
    );
    expect(document.querySelector('#dice-announcement')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(document.querySelector('#dice-announcement')).toHaveAttribute(
      'role',
      'status',
    );
    expect(document.querySelector('#dice-total')).not.toHaveAttribute(
      'aria-live',
    );
    expect(document.querySelector('#dice-result')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('con prefers-reduced-motion resuelve sin animación', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    renderDice();
    rollDice(6);

    await waitFor(() =>
      expect(document.querySelector('#dice-total')).toBeInTheDocument(),
    );
    expect(document.querySelector('#dice-result')).not.toHaveClass(
      'animate-dice-shake',
    );
  });

  it('tira cada dado (d4/d6/d8/d12/d20) con modificador y registra el histórico', () => {
    mockRequestAnimationFrame();
    renderDice();

    for (const sides of [4, 6, 8, 12, 20]) {
      rollDice(sides);
      const entries = useHistoryStore.getState().entries;
      const last = entries[entries.length - 1];
      expect(last.module).toBe('dice');
      expect(last.description).toMatch(/^d\d+(\+\d+)? = \d+$/);
    }
    expect(useHistoryStore.getState().entries).toHaveLength(5);
  });

  it('aplica la clase animate-dice-shake mientras la tirada está en curso', async () => {
    // rAF controlado: primera llamada con delta < 500ms (shaking), segunda >= 500ms (commit).
    const rafCalls: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCalls.push(cb);
      return rafCalls.length;
    });

    const user = createUserEvent();
    renderDice();
    await fillByLabel(user, 'Modificador', '2');
    rollDice(6);

    expect(rafCalls).toHaveLength(1);
    act(() => {
      rafCalls[0](100); // now - animationStart < 500 → entra en animación
    });
    await waitFor(() =>
      expect(document.querySelector('#dice-result')).toHaveClass('animate-dice-shake'),
    );
    act(() => {
      rafCalls[1](5000); // delta >= 500 → commitea el resultado
    });
    await waitFor(() => expect(document.querySelector('#dice-total')).toBeInTheDocument());
  });

  it('muestra un error RPG cuando la estrategia lanza', async () => {
    mockRequestAnimationFrame();
    vi.spyOn(diceStrategy, 'execute').mockImplementation(() => {
      throw new Error('Dado no válido');
    });

    renderDice();
    rollDice(6);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Dado no válido');
    expect(screen.getByRole('group', { name: 'Dado' })).toHaveAttribute(
      'aria-describedby',
      'dice-error',
    );
  });

  it('despliega el desglose de tiradas múltiples en el total', async () => {
    mockRequestAnimationFrame();
    vi.spyOn(diceStrategy, 'execute').mockReturnValue({
      local: { rolls: [3, 5], total: 8, modifier: 0 },
      backend: { rolls: [3, 5], total: 8, modifier: 0 },
    });

    renderDice();
    rollDice(6);

    await waitFor(() =>
      expect(document.querySelector('#dice-total')).toBeInTheDocument(),
    );
    expect(
      document.querySelector('#dice-total')!.textContent,
    ).toContain('tiradas: 3, 5');
  });

  it('restaura modificador y último dado, y los restablece', async () => {
    mockRequestAnimationFrame();
    const user = createUserEvent();
    const first = renderDice();
    await fillByLabel(user, 'Modificador', '3');
    rollDice(20);
    await waitFor(() =>
      expect(document.querySelector('#dice-total')).toBeInTheDocument(),
    );

    first.unmount();
    renderDice();

    expect(screen.getByLabelText('Modificador')).toHaveValue(3);
    expect(screen.getByRole('button', { name: 'd20' })).toHaveAttribute(
      'data-active',
      'true',
    );

    const userAfterReload = createUserEvent();
    await userAfterReload.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(screen.getByLabelText('Modificador')).toHaveValue(0);
    expect(screen.getByRole('button', { name: 'd20' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
