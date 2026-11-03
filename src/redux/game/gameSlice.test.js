import { describe, it, expect, vi, afterEach } from 'vitest';
import gameReducer, { moveExecuted, endGame } from './gameSlice';
import { COLORS } from './gameConstants';
import { ALL_CASTLING } from '../../test/fixtures';

// Крок 2 (docs/move-validation.md, розділ 5): захоплення `captured`
// до перезапису клітинки `to`, безпосередньо в редюсері — так це
// покриває обидва місця диспатчу moveExecuted (звичайний хід і
// "аналіз без правил" у gameOperations.js) без дублювання логіки.
describe('gameSlice: moveExecuted', () => {
  it('записує captured: null для тихого ходу на порожню клітинку', () => {
    const state = {
      board: { e2: 'P' },
      selectedSquare: 'e2',
      history: [],
      plyCount: 0,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e2', to: 'e4', piece: 'P' })
    );

    expect(next.board).toEqual({ e4: 'P' });
    expect(next.history).toHaveLength(1);
    expect(next.history[0].captured).toBeNull();
  });

  it('захоплює фігуру з `to` ДО того, як вона буде затерта', () => {
    const state = {
      board: { e4: 'P', d5: 'p' },
      selectedSquare: 'e4',
      history: [],
      plyCount: 0,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e4', to: 'd5', piece: 'P' })
    );

    expect(next.board).toEqual({ d5: 'P' });
    expect(next.history[0].captured).toBe('p');
  });

  it('не втрачає інші поля payload (наприклад, analysis-прапорець)', () => {
    const state = {
      board: { e4: 'P', d5: 'p' },
      selectedSquare: null,
      history: [],
      plyCount: 0,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e4', to: 'd5', piece: 'P', analysis: true })
    );

    expect(next.history[0]).toMatchObject({ analysis: true, captured: 'p' });
  });

  it('знімає виділення й інкрементить plyCount', () => {
    const state = {
      board: { e2: 'P' },
      selectedSquare: 'e2',
      history: [],
      plyCount: 4,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e2', to: 'e4', piece: 'P' })
    );

    expect(next.selectedSquare).toBeNull();
    expect(next.plyCount).toBe(5);
  });
});

// Тести правил (рокіровка, права рокіровки, en passant, промоція) живуть у
// src/engine/applyMove.test.js, а SAN через повний пайплайн — у
// gameOperations.test.js ("attemptMove — нотація"). Тут — лише запис даних.

// docs/clock-and-game-record.md, крок 1: годинник на глобальному відліку
// часу — moveExecuted списує РЕАЛЬНИЙ час, що минув з turnStartedAt, а не
// тік таймера. vi.setSystemTime дає детермінований контроль над Date.now(),
// без якого ці тести залежали б від фактичної швидкості виконання коду.
describe('gameSlice: moveExecuted — годинник (docs/clock-and-game-record.md)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('списує з активної сторони саме стільки часу, скільки реально минуло від turnStartedAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = {
      board: { e7: 'p' },
      selectedSquare: 'e7',
      history: [],
      plyCount: 1, // хід чорних — turnStartedAt належить саме їм
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: 1_000_000 - 4230, // чорні отримали хід 4.23с тому
      castlingRights: ALL_CASTLING,
      enPassantTarget: null,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e7', to: 'e5', piece: 'p' })
    );

    expect(next.blackTime).toBe(180000 - 4230);
    expect(next.whiteTime).toBe(180000); // чужий годинник хід не чіпає
    expect(next.turnStartedAt).toBe(1_000_000); // новий якір — для НАСТУПНОЇ сторони (білих)
  });

  it('перший хід партії (turnStartedAt: null) нічого не списує', () => {
    const state = {
      board: { e2: 'P' },
      selectedSquare: 'e2',
      history: [],
      plyCount: 0,
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: null,
      castlingRights: ALL_CASTLING,
      enPassantTarget: null,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e2', to: 'e4', piece: 'P' })
    );

    expect(next.whiteTime).toBe(180000);
    expect(next.blackTime).toBe(180000);
    expect(next.turnStartedAt).not.toBeNull(); // але годинник тепер стартував — для чорних
  });

  it('не йде нижче нуля, навіть якщо минуло більше часу, ніж лишалось', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = {
      board: { e7: 'p' },
      selectedSquare: 'e7',
      history: [],
      plyCount: 1,
      whiteTime: 180000,
      blackTime: 500, // лишалось пів секунди
      turnStartedAt: 1_000_000 - 4000, // а минуло 4с
      castlingRights: ALL_CASTLING,
      enPassantTarget: null,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e7', to: 'e5', piece: 'p' })
    );

    expect(next.blackTime).toBe(0);
  });
});

// docs/clock-and-game-record.md, крок 6: повний запис партії — timestamp,
// moveTimeMs і clockAfter (знімок ОБОХ годинників) на кожному елементі
// history. Той самий сценарій, який план пропонував перевірити вручну через
// Redux DevTools ("зробити кілька ходів, подивитись на history") — тут
// відтворений детерміновано, замість одноразового погляду в браузері.
describe('gameSlice: moveExecuted — повний запис партії (крок 6)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('перший хід партії: timestamp виставлений, moveTimeMs=0, clockAfter = стартовий час обох сторін', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = {
      board: { e2: 'P' },
      selectedSquare: 'e2',
      history: [],
      plyCount: 0,
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: null, // до першого ходу годинник не йде
      castlingRights: ALL_CASTLING,
      enPassantTarget: null,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e2', to: 'e4', piece: 'P' })
    );

    expect(next.history[0]).toMatchObject({
      timestamp: 1_000_000,
      moveTimeMs: 0,
      clockAfter: { w: 180000, b: 180000 },
    });
  });

  it('другий хід (чорних): timestamp/moveTimeMs відображають реальний час, clockAfter — ОБИДВА годинники одразу після ходу', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = {
      board: { e7: 'p' },
      selectedSquare: 'e7',
      history: [{ from: 'e2', to: 'e4', piece: 'P' }],
      plyCount: 1,
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: 1_000_000 - 4230, // чорні думали 4.23с
      castlingRights: ALL_CASTLING,
      enPassantTarget: null,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e7', to: 'e5', piece: 'p' })
    );

    expect(next.history[1]).toMatchObject({
      timestamp: 1_000_000,
      moveTimeMs: 4230,
      clockAfter: { w: 180000, b: 180000 - 4230 }, // чорні списались, білі ще незаймані
    });
  });

  it('`timestamp` елемента дорівнює новому `turnStartedAt` (та сама мить, один Date.now() на редюсер)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_234_567);

    const state = {
      board: { e2: 'P' },
      selectedSquare: 'e2',
      history: [],
      plyCount: 0,
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: null,
      castlingRights: ALL_CASTLING,
      enPassantTarget: null,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'e2', to: 'e4', piece: 'P' })
    );

    expect(next.history[0].timestamp).toBe(next.turnStartedAt);
  });
});

describe('gameSlice: endGame — годинник при таймауті', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('фіксує залишок сторони, що прострочила час, у 0, коли переданий timedOutColor', () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);

    const state = {
      whiteTime: 180000,
      blackTime: 1200, // формально ще не 0 — цокав, поки надійшла подія
      turnStartedAt: 2_000_000 - 5000, // а минуло 5с, тобто час насправді вже вичерпано
    };

    const next = gameReducer(
      state,
      endGame({
        winner: COLORS.WHITE,
        reason: 'timeout',
        timedOutColor: COLORS.BLACK,
      })
    );

    expect(next.blackTime).toBe(0);
    expect(next.whiteTime).toBe(180000); // чужого годинника не чіпаємо
    expect(next.turnStartedAt).toBeNull();
    expect(next.isGameOver).toBe(true);
  });

  it('без timedOutColor (напр. мат/пат/здача) годинники просто зупиняються, значення не чіпаються', () => {
    const state = {
      whiteTime: 42000,
      blackTime: 99000,
      turnStartedAt: 123456,
    };

    const next = gameReducer(
      state,
      endGame({ winner: COLORS.WHITE, reason: 'checkmate' })
    );

    expect(next.whiteTime).toBe(42000);
    expect(next.blackTime).toBe(99000);
    expect(next.turnStartedAt).toBeNull();
  });
});
