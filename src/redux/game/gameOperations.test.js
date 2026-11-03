import { describe, it, expect, vi, afterEach } from 'vitest';
import { attemptMove, timeExpired } from './gameOperations';
import { ALL_CASTLING } from '../../test/fixtures';
import { createTestStore } from '../../test/fixtures/store';

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

    store.dispatch(
      attemptMove({ from: 'a7', to: 'a8', piece: 'P', promotion: 'n' })
    );

    expect(store.getState().game.board.a8).toBe('N');
  });

  it('чорний пішак промотує на 1-му ряду в нижньому регістрі', () => {
    const store = createTestStore({ board: { a2: 'p' }, plyCount: 1 });

    store.dispatch(attemptMove({ from: 'a2', to: 'a1', piece: 'p' }));

    expect(store.getState().game.board.a1).toBe('q');
  });

  it('відхиляє хід із недійсною фігурою для промоції (напр., король) — дошка не змінюється', () => {
    const store = createTestStore({ board: { a7: 'P' }, plyCount: 0 });

    store.dispatch(
      attemptMove({ from: 'a7', to: 'a8', piece: 'P', promotion: 'k' })
    );

    expect(store.getState().game.board).toEqual({ a7: 'P' });
    expect(store.getState().game.history).toEqual([]);
  });

  it('звичайний хід (не на останній ряд) ігнорує promotion, навіть якщо він переданий помилково', () => {
    const store = createTestStore({ board: { a6: 'P' }, plyCount: 0 });

    store.dispatch(
      attemptMove({ from: 'a6', to: 'a7', piece: 'P', promotion: 'k' })
    );

    // Промоція тут не застосовна — недійсне значення `promotion` для
    // звичайного ходу не має значення й не блокує хід.
    expect(store.getState().game.board).toEqual({ a7: 'P' });
  });
});

// SAN + isCheck/isCheckmate через повний пайплайн attemptMove -> moveExecuted.
// Перенесено з gameSlice.test.js (крок 3, docs/layer-separation-step3.md):
// ці тести перевіряють шахи, а не запис, тож мають проходити незалежно від
// того, де саме рахується SAN — у редюсері чи в thunk-у. Позиції — легальні
// (обидва королі, хід за чергою), бо attemptMove перевіряє правила.
describe('attemptMove — нотація', () => {
  it('записує san для звичайного тихого ходу', () => {
    const store = createTestStore({ board: { e1: 'K', e2: 'P', e8: 'k' } });

    store.dispatch(attemptMove({ from: 'e2', to: 'e4', piece: 'P' }));

    const [entry] = store.getState().game.history;
    expect(entry.san).toBe('e4');
    expect(entry.isCheck).toBe(false);
    expect(entry.isCheckmate).toBe(false);
  });

  it('san містить "x" для взяття', () => {
    const store = createTestStore({
      board: { e1: 'K', e4: 'P', d5: 'p', e8: 'k' },
    });

    store.dispatch(attemptMove({ from: 'e4', to: 'd5', piece: 'P' }));

    expect(store.getState().game.history[0].san).toBe('exd5');
  });

  it('san отримує суфікс "+", якщо хід дає шах суперникові', () => {
    // Тура йде на відкритий 8-й ряд і шахує короля по рангу; у короля є
    // втеча на 7-й ряд, тож це шах, а не мат.
    const store = createTestStore({ board: { e1: 'K', a1: 'R', e8: 'k' } });

    store.dispatch(attemptMove({ from: 'a1', to: 'a8', piece: 'R' }));

    const { history, isGameOver } = store.getState().game;
    expect(history[0].san).toBe('Ra8+');
    expect(history[0].isCheck).toBe(true);
    expect(history[0].isCheckmate).toBe(false);
    expect(isGameOver).toBe(false);
  });

  it('san отримує суфікс "#" на матовій позиції і партія завершується', () => {
    // Back-rank mate: чорна тура a2-a1, білий король g1 замкнений власними
    // пішаками f2/g2/h2, а f1 і h1 б'є та сама тура.
    const store = createTestStore({
      board: { g1: 'K', f2: 'P', g2: 'P', h2: 'P', a2: 'r', a8: 'k' },
      plyCount: 1,
    });

    store.dispatch(attemptMove({ from: 'a2', to: 'a1', piece: 'r' }));

    const { history, isGameOver, winner, reason } = store.getState().game;
    expect(history[0].san).toBe('Ra1#');
    expect(history[0].isCheckmate).toBe(true);
    expect(isGameOver).toBe(true);
    expect(winner).toBe('b');
    expect(reason).toBe('checkmate');
  });

  it('рокіровка отримує san "O-O", а не "Kg1"', () => {
    const store = createTestStore({
      board: { e1: 'K', h1: 'R', e8: 'k' },
      castlingRights: ALL_CASTLING,
    });

    store.dispatch(attemptMove({ from: 'e1', to: 'g1', piece: 'K' }));

    expect(store.getState().game.history[0].san).toBe('O-O');
  });

  // buildSan вважає promotion необов'язковим: якщо details не дійдуть до
  // SAN, запис мовчки стане 'a8' — ловимо це тут.
  it('промоція отримує san з "=Q"', () => {
    const store = createTestStore({ board: { e1: 'K', a7: 'P', h6: 'k' } });

    store.dispatch(attemptMove({ from: 'a7', to: 'a8', piece: 'P' }));

    expect(store.getState().game.history[0].san).toBe('a8=Q');
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
    const store = createTestStore({
      isGameOver: true,
      winner: 'w',
      reason: 'checkmate',
    });

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
