import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './gameSlice';
import { attemptMove, timeExpired } from './gameOperations';

// Мінімальний ізольований store — без redux-persist/localStorage побічних
// ефектів справжнього src/redux/store.js (вони тут не потрібні й лише
// забруднювали б тест).
function createTestStore(gameStateOverrides) {
  return configureStore({
    reducer: { game: gameReducer },
    preloadedState: {
      game: {
        board: {},
        selectedSquare: null,
        whiteTime: 180000,
        blackTime: 180000,
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

// Крок 6 (docs/move-validation.md, розділ 5): промоція через повний
// пайплайн attemptMove -> moveExecuted, не лише ізольований редюсер.
describe('attemptMove — промоція', () => {
  it('пішак на останньому ряду автоматично стає ферзем, якщо promotion не вказано', () => {
    const store = createTestStore({ board: { a7: 'P' }, plyCount: 0 });

    store.dispatch(attemptMove({ from: 'a7', to: 'a8', piece: 'P' }));

    expect(store.getState().game.board.a8).toBe('Q');
    expect(store.getState().game.history[0].promotion).toBe('Q');
  });

  it('пішак стає обраною гравцем фігурою, якщо promotion вказано', () => {
    const store = createTestStore({ board: { a7: 'P' }, plyCount: 0 });

    store.dispatch(attemptMove({ from: 'a7', to: 'a8', piece: 'P', promotion: 'n' }));

    expect(store.getState().game.board.a8).toBe('N');
  });

  it('чорний пішак промотує на 1-му ряду в нижньому регістрі', () => {
    const store = createTestStore({ board: { a2: 'p' }, plyCount: 1 });

    store.dispatch(attemptMove({ from: 'a2', to: 'a1', piece: 'p' }));

    expect(store.getState().game.board.a1).toBe('q');
  });

  it('відхиляє хід із недійсною фігурою для промоції (напр., король) — дошка не змінюється', () => {
    const store = createTestStore({ board: { a7: 'P' }, plyCount: 0 });

    store.dispatch(attemptMove({ from: 'a7', to: 'a8', piece: 'P', promotion: 'k' }));

    expect(store.getState().game.board).toEqual({ a7: 'P' });
    expect(store.getState().game.history).toEqual([]);
  });

  it('звичайний хід (не на останній ряд) ігнорує promotion, навіть якщо він переданий помилково', () => {
    const store = createTestStore({ board: { a6: 'P' }, plyCount: 0 });

    store.dispatch(attemptMove({ from: 'a6', to: 'a7', piece: 'P', promotion: 'k' }));

    // Промоція тут не застосовна — недійсне значення `promotion` для
    // звичайного ходу не має значення й не блокує хід.
    expect(store.getState().game.board).toEqual({ a7: 'P' });
  });
});

// timeExpired — Clock.jsx кличе це напряму (onTimeUp), коли час дійшов до
// нуля; єдине джерело події 'timeout' для endGame (раніше тут була зламана
// tickTimer, що дзвонила в неіснуючий setGameOver — див. коментар у
// gameOperations.js).
describe('timeExpired', () => {
  it('завершує партію перемогою суперника кольору, чий час вичерпався', () => {
    const store = createTestStore({});

    store.dispatch(timeExpired('w'));

    expect(store.getState().game).toMatchObject({
      isGameOver: true,
      winner: 'b',
      reason: 'timeout',
    });
  });

  it('не перезаписує вже завершену партію (напр., мат стався раніше за тік годинника)', () => {
    const store = createTestStore({ isGameOver: true, winner: 'w', reason: 'checkmate' });

    store.dispatch(timeExpired('b'));

    expect(store.getState().game).toMatchObject({
      isGameOver: true,
      winner: 'w',
      reason: 'checkmate',
    });
  });
});
