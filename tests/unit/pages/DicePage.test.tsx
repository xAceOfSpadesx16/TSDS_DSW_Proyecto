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
  render(<DicePage />);
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
    // La cara del dado (output) se renderiza con el valor inicial displayRoll=1.
    expect(document.querySelector('#dice-result')).toHaveTextContent('1');
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
});
