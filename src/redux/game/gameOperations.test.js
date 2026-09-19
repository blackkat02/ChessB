import { describe, it, expect, vi, afterEach } from 'vitest';
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

// timeExpired — диспатчиться з useGameState.js, коли selectClockRemaining
// показує 0 для активної сторони (docs/clock-and-game-record.md); єдине
// джерело події 'timeout' для endGame (раніше тут була зламана tickTimer,
// що дзвонила в неіснуючий setGameOver — див. коментар у gameOperations.js).
describe('timeExpired', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('завершує партію перемогою суперника кольору, чий час вичерпався', () => {
    const store = createTestStore({
      plyCount: 2, // парне число — хід білих, і саме їхній час вичерпався
      whiteTime: 0,
      turnStartedAt: Date.now(),
    });

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

  // docs/clock-and-game-record.md, розділ 6, рядок "таймаут прийшов двічі":
  // захист від застарілого замикання — викликач міг порахувати 0 на
  // попередньому рендері, а на момент, коли dispatch дійшов сюди, час
  // насправді ще є (наприклад, після Кроку 4 — вкладка повернулась з фону,
  // і за цю мить встиг пройти ще один, вже актуальний перерахунок).
  it('НЕ завершує партію, якщо жива перевірка (selectClockRemaining) показує, що час ще є', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const store = createTestStore({
      plyCount: 2,
      whiteTime: 5000, // 5с реально лишається
      turnStartedAt: 1_000_000,
    });

    vi.setSystemTime(1_001_000); // минула лише 1с — залишок ще додатній

    store.dispatch(timeExpired('w'));

    expect(store.getState().game.isGameOver).toBe(false);
  });

  // Крок 1 (gameSlice.js) підготував гілку endGame, що фіксує залишок
  // сторони, яка прострочила час, у 0 — але вона мовчки не спрацьовувала,
  // бо жоден реальний виклик не передавав `timedOutColor`. Цей крок
  // під'єднав його — ось де саме та гілка нарешті оживає.
  it('фіксує залишок сторони, що прострочила час, рівно у 0 у фінальному записі', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const store = createTestStore({
      plyCount: 2,
      whiteTime: 200, // формально ще не 0, коли подія прийшла
      turnStartedAt: 1_000_000,
    });

    vi.setSystemTime(1_005_000); // а насправді минуло 5с — час давно вичерпано

    store.dispatch(timeExpired('w'));

    expect(store.getState().game.whiteTime).toBe(0);
  });
});
