import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../redux/game/gameSlice';
import { useGameState } from './useGameState';

function createTestStore(gameStateOverrides) {
  return configureStore({
    reducer: { game: gameReducer },
    preloadedState: {
      game: {
        board: {},
        selectedSquare: null,
        whiteTime: 180000,
        blackTime: 180000,
        turnStartedAt: null,
        history: [],
        plyCount: 0,
        winner: null,
        reason: null,
        isGameOver: false,
        playerSide: 'w',
        gameId: 0,
        castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
        enPassantTarget: null,
        ...gameStateOverrides,
      },
    },
  });
}

function Harness({ onState, onHandlers }) {
  const gameStateResult = useGameState();
  onState(gameStateResult.gameState);
  onHandlers?.(gameStateResult);
  return null;
}

describe('useGameState — сирі поля годинника й handleTimeUp', () => {
  it('gameState віддає whiteTime/blackTime/turnStartedAt БЕЗ обчислень — так, як у сторі', () => {
    const store = createTestStore({
      plyCount: 1,
      whiteTime: 111000,
      blackTime: 222000,
      turnStartedAt: 555,
    });

    let latestState;
    render(
      <Provider store={store}>
        <Harness onState={(s) => (latestState = s)} />
      </Provider>
    );

    expect(latestState.whiteTime).toBe(111000);
    expect(latestState.blackTime).toBe(222000);
    expect(latestState.turnStartedAt).toBe(555);
  });

  it('handleTimeUp(color) диспатчить timeExpired — партія завершується таймаутом', () => {
    const store = createTestStore({
      plyCount: 2, // парне — хід білих
      whiteTime: 0,
      turnStartedAt: Date.now(),
    });

    let handlers;
    render(
      <Provider store={store}>
        <Harness onState={() => {}} onHandlers={(h) => (handlers = h)} />
      </Provider>
    );

    act(() => {
      handlers.handleTimeUp('w');
    });

    expect(store.getState().game.isGameOver).toBe(true);
    expect(store.getState().game.reason).toBe('timeout');
    expect(store.getState().game.winner).toBe('b');
  });
});
