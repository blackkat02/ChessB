import { describe, it, expect, vi, afterEach } from 'vitest';
import gameReducer, { moveExecuted, endGame } from './gameSlice';
import { COLORS } from './gameConstants';
import { ALL_CASTLING, makeMovePayload } from '../../test/fixtures';
import { makeSliceState } from '../../test/fixtures/store';

// Крок 3 шарів (docs/layer-separation-step3.md, 3.5): moveExecuted лише
// записує готовий результат, який порахував attemptMove. Тому тут payload
// збирається вручну через makeMovePayload, без рушія: перевіряємо "редюсер
// записав те, що прийшло", а не шахи. Правила (рокіровка, en passant,
// промоція) — у src/engine/applyMove.test.js, SAN і мат через повний
// пайплайн — у gameOperations.test.js.

// Хід чорних e7-e5 — для тестів годинника, де ходить друга сторона.
const blackE5 = (overrides = {}) =>
  makeMovePayload({
    move: { from: 'e7', to: 'e5', piece: 'p' },
    color: COLORS.BLACK,
    position: {
      board: { e5: 'p' },
      castlingRights: { ...ALL_CASTLING },
      enPassantTarget: 'e6',
    },
    san: 'e5',
    ...overrides,
  });

describe('gameSlice: moveExecuted — запис позиції та history', () => {
  it('бере board, castlingRights, enPassantTarget і turn з payload.position', () => {
    const state = makeSliceState({ board: { e2: 'P' } });
    const payload = makeMovePayload({
      position: {
        board: { e4: 'P' },
        castlingRights: { ...ALL_CASTLING, whiteShort: false },
        enPassantTarget: 'e3',
        turn: 'b',
      },
    });

    const next = gameReducer(state, moveExecuted(payload));

    expect(next.board).toEqual({ e4: 'P' });
    expect(next.castlingRights).toEqual({ ...ALL_CASTLING, whiteShort: false });
    expect(next.enPassantTarget).toBe('e3');
    expect(next.turn).toBe('b');
  });

  it('на старті партії хід білих', () => {
    expect(makeSliceState().turn).toBe('w');
  });

  it('записує в history хід, details, статус і SAN з payload', () => {
    const payload = makeMovePayload({
      move: { from: 'e4', to: 'd5', piece: 'P' },
      details: {
        captured: 'p',
        castling: null,
        enPassant: false,
        promotion: null,
      },
      isCheck: true,
      san: 'exd5+',
    });

    const next = gameReducer(makeSliceState(), moveExecuted(payload));

    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toMatchObject({
      from: 'e4',
      to: 'd5',
      piece: 'P',
      captured: 'p',
      isCheck: true,
      isCheckmate: false,
      san: 'exd5+',
    });
  });

  it("details.promotion перекриває move.promotion (undefined → розв'язана Q)", () => {
    const payload = makeMovePayload({
      move: { from: 'a7', to: 'a8', piece: 'P', promotion: undefined },
      details: {
        captured: null,
        castling: null,
        enPassant: false,
        promotion: 'Q',
      },
      san: 'a8=Q',
    });

    const next = gameReducer(makeSliceState(), moveExecuted(payload));

    expect(next.history[0].promotion).toBe('Q');
  });

  it('analysis-прапорець потрапляє в запис, лише коли переданий', () => {
    const analysed = gameReducer(
      makeSliceState(),
      moveExecuted(makeMovePayload({ analysis: true }))
    );
    const normal = gameReducer(
      makeSliceState(),
      moveExecuted(makeMovePayload())
    );

    expect(analysed.history[0].analysis).toBe(true);
    expect(normal.history[0]).not.toHaveProperty('analysis');
  });

  it('знімає виділення й інкрементить plyCount', () => {
    const state = makeSliceState({ selectedSquare: 'e2', plyCount: 4 });

    const next = gameReducer(state, moveExecuted(makeMovePayload()));

    expect(next.selectedSquare).toBeNull();
    expect(next.plyCount).toBe(5);
  });
});

// docs/clock-and-game-record.md, крок 1: годинник на глобальному відліку
// часу — moveExecuted списує РЕАЛЬНИЙ час, що минув з turnStartedAt, а не
// тік таймера. Мить ходу приходить у payload.timestamp, тож мокати
// Date.now() не треба: однаковий action — однаковий стан.
describe('gameSlice: moveExecuted — годинник (docs/clock-and-game-record.md)', () => {
  it('списує з активної сторони саме стільки часу, скільки минуло від turnStartedAt', () => {
    const state = makeSliceState({
      plyCount: 1, // хід чорних — turnStartedAt належить саме їм
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: 1_000_000 - 4230, // чорні отримали хід 4.23с тому
    });

    const next = gameReducer(
      state,
      moveExecuted(blackE5({ timestamp: 1_000_000 }))
    );

    expect(next.blackTime).toBe(180000 - 4230);
    expect(next.whiteTime).toBe(180000); // чужий годинник хід не чіпає
    expect(next.turnStartedAt).toBe(1_000_000); // новий якір — для НАСТУПНОЇ сторони (білих)
  });

  it('годинник обирається за payload.color, а не за фігурою', () => {
    // Редюсер більше не питає рушій про колір фігури — довіряє payload.
    const state = makeSliceState({
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: 1_000_000 - 1000,
    });

    const next = gameReducer(
      state,
      moveExecuted(
        makeMovePayload({ color: COLORS.BLACK, timestamp: 1_000_000 })
      )
    );

    expect(next.blackTime).toBe(179000);
    expect(next.whiteTime).toBe(180000);
  });

  it('перший хід партії (turnStartedAt: null) нічого не списує', () => {
    const state = makeSliceState({
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: null,
    });

    const next = gameReducer(
      state,
      moveExecuted(makeMovePayload({ timestamp: 1_000_000 }))
    );

    expect(next.whiteTime).toBe(180000);
    expect(next.blackTime).toBe(180000);
    expect(next.turnStartedAt).toBe(1_000_000); // але годинник тепер стартував — для чорних
  });

  it('не йде нижче нуля, навіть якщо минуло більше часу, ніж лишалось', () => {
    const state = makeSliceState({
      plyCount: 1,
      whiteTime: 180000,
      blackTime: 500, // лишалось пів секунди
      turnStartedAt: 1_000_000 - 4000, // а минуло 4с
    });

    const next = gameReducer(
      state,
      moveExecuted(blackE5({ timestamp: 1_000_000 }))
    );

    expect(next.blackTime).toBe(0);
  });
});

// docs/clock-and-game-record.md, крок 6: повний запис партії — timestamp,
// moveTimeMs і clockAfter (знімок ОБОХ годинників) на кожному елементі
// history.
describe('gameSlice: moveExecuted — повний запис партії (крок 6)', () => {
  it('перший хід партії: timestamp з payload, moveTimeMs=0, clockAfter = стартовий час обох сторін', () => {
    const state = makeSliceState({
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: null, // до першого ходу годинник не йде
    });

    const next = gameReducer(
      state,
      moveExecuted(makeMovePayload({ timestamp: 1_000_000 }))
    );

    expect(next.history[0]).toMatchObject({
      timestamp: 1_000_000,
      moveTimeMs: 0,
      clockAfter: { w: 180000, b: 180000 },
    });
  });

  it('другий хід (чорних): moveTimeMs — реальний час, clockAfter — ОБИДВА годинники одразу після ходу', () => {
    const state = makeSliceState({
      history: [{ from: 'e2', to: 'e4', piece: 'P' }],
      plyCount: 1,
      whiteTime: 180000,
      blackTime: 180000,
      turnStartedAt: 1_000_000 - 4230, // чорні думали 4.23с
    });

    const next = gameReducer(
      state,
      moveExecuted(blackE5({ timestamp: 1_000_000 }))
    );

    expect(next.history[1]).toMatchObject({
      timestamp: 1_000_000,
      moveTimeMs: 4230,
      clockAfter: { w: 180000, b: 180000 - 4230 }, // чорні списались, білі ще незаймані
    });
  });

  it('`timestamp` елемента дорівнює новому `turnStartedAt` (та сама мить з payload)', () => {
    const next = gameReducer(
      makeSliceState(),
      moveExecuted(makeMovePayload({ timestamp: 1_234_567 }))
    );

    expect(next.history[0].timestamp).toBe(1_234_567);
    expect(next.turnStartedAt).toBe(1_234_567);
  });

  it('чистий редюсер: однаковий action двічі дає однаковий стан', () => {
    const state = makeSliceState({ turnStartedAt: 999_000 });
    const action = moveExecuted(makeMovePayload({ timestamp: 1_000_000 }));

    expect(gameReducer(state, action)).toEqual(gameReducer(state, action));
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

// Крок 3 шарів (docs/layer-separation-step3.md, 3.6): Date.now() переїхав з
// редюсера в prepare-колбек action creator-а.
describe('gameSlice: endGame — timestamp через prepare', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('редюсер бере мить з payload.timestamp, без мокання таймерів', () => {
    const state = makeSliceState({
      whiteTime: 180000,
      blackTime: 1200,
      turnStartedAt: 2_000_000 - 5000,
    });

    const next = gameReducer(
      state,
      endGame({
        winner: COLORS.WHITE,
        reason: 'timeout',
        timedOutColor: COLORS.BLACK,
        timestamp: 2_000_000,
      })
    );

    expect(next.blackTime).toBe(0);
  });

  it('чистий редюсер: однаковий action двічі дає однаковий стан', () => {
    const state = makeSliceState({
      blackTime: 60000,
      turnStartedAt: 2_000_000 - 5000,
    });
    const action = endGame({
      winner: COLORS.WHITE,
      reason: 'timeout',
      timedOutColor: COLORS.BLACK,
    });

    expect(gameReducer(state, action)).toEqual(gameReducer(state, action));
  });

  it('prepare додає поточну мить, якщо timestamp не передано', () => {
    vi.useFakeTimers();
    vi.setSystemTime(777);

    const action = endGame({ winner: COLORS.WHITE, reason: 'resignation' });

    expect(action.type).toBe('game/endGame'); // PERSIST_ON у store.js не зачеплено
    expect(action.payload).toEqual({
      winner: COLORS.WHITE,
      reason: 'resignation',
      timestamp: 777,
    });
  });
});
