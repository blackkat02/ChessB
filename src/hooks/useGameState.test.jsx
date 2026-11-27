import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useGameState } from './useGameState';
import { createTestStore } from '../test/fixtures/store';

// Хук працює лише всередині <Provider>, тож загортаємо його через wrapper.
const renderWithStore = (store) =>
  renderHook(() => useGameState(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

describe('useGameState — сирі поля годинника й handleTimeUp', () => {
  it('gameState віддає whiteTime/blackTime/turnStartedAt БЕЗ обчислень — так, як у сторі', () => {
    const store = createTestStore({
      game: {
        plyCount: 1,
        whiteTime: 111000,
        blackTime: 222000,
        turnStartedAt: 555,
      },
    });

    const { result } = renderWithStore(store);
    const { gameState } = result.current;

    expect(gameState.whiteTime).toBe(111000);
    expect(gameState.blackTime).toBe(222000);
    expect(gameState.turnStartedAt).toBe(555);
  });

  it('handleTimeUp(color) диспатчить timeExpired — партія завершується таймаутом', () => {
    const store = createTestStore({
      // У чорних є ферзь — таймаут білих означає перемогу чорних, а не нічию.
      position: { board: { e1: 'K', e8: 'k', d8: 'q' } },
      game: {
        plyCount: 2, // парне — хід білих
        whiteTime: 0,
        turnStartedAt: Date.now(),
      },
    });

    const { result } = renderWithStore(store);

    act(() => {
      result.current.handleTimeUp('w');
    });

    const { game } = store.getState();
    expect(game.isGameOver).toBe(true);
    expect(game.reason).toBe('timeout');
    expect(game.winner).toBe('b');
  });
});
