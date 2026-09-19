import { describe, it, expect, vi, afterEach } from 'vitest';
import gameReducer, { moveExecuted, endGame } from './gameSlice';
import { COLORS } from './gameConstants';

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

    const next = gameReducer(state, moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));

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

    const next = gameReducer(state, moveExecuted({ from: 'e4', to: 'd5', piece: 'P' }));

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

    const next = gameReducer(state, moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));

    expect(next.selectedSquare).toBeNull();
    expect(next.plyCount).toBe(5);
  });
});

const FULL_CASTLING_RIGHTS = { wK: true, wQ: true, bK: true, bQ: true };
const NO_CASTLING_RIGHTS = { wK: false, wQ: false, bK: false, bQ: false };

// Крок 4 (docs/move-validation.md, розділ 5): рокіровка, взяття на проході,
// оновлення castlingRights/enPassantTarget — усе відбувається в одному й
// тому самому редюсері moveExecuted, а не в окремих екшенах.
describe('gameSlice: moveExecuted — крок 4', () => {
  it('рокіровка (коротка, білі): пересуває і короля, і туру', () => {
    const state = {
      board: { e1: 'K', h1: 'R' },
      selectedSquare: 'e1',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e1', to: 'g1', piece: 'K' }));

    expect(next.board).toEqual({ g1: 'K', f1: 'R' });
    expect(next.history[0].castling).toBe('K');
  });

  it('рокіровка (довга, чорні): пересуває і короля, і туру', () => {
    const state = {
      board: { e8: 'k', a8: 'r' },
      selectedSquare: 'e8',
      history: [],
      plyCount: 1,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e8', to: 'c8', piece: 'k' }));

    expect(next.board).toEqual({ c8: 'k', d8: 'r' });
    expect(next.history[0].castling).toBe('Q');
  });

  it('звичайний хід короля на сусідню клітинку — це НЕ рокіровка', () => {
    const state = {
      board: { e1: 'K' },
      selectedSquare: 'e1',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e1', to: 'f1', piece: 'K' }));

    expect(next.history[0].castling).toBeNull();
  });

  it('хід короля відбирає ОБИДВА права рокіровки цього кольору', () => {
    const state = {
      board: { e1: 'K' },
      selectedSquare: 'e1',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e1', to: 'f1', piece: 'K' }));

    expect(next.castlingRights).toMatchObject({ wK: false, wQ: false });
    expect(next.castlingRights).toMatchObject({ bK: true, bQ: true });
  });

  it('хід тури зі стартової клітинки відбирає лише ВІДПОВІДНЕ право', () => {
    const state = {
      board: { a1: 'R' },
      selectedSquare: 'a1',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'a1', to: 'a4', piece: 'R' }));

    expect(next.castlingRights).toMatchObject({ wQ: false, wK: true });
  });

  it('НЕ туру, а іншу фігуру, що поїхала зі стартової клітинки тури, право не чіпає', () => {
    // Штучний, нереальний "знімок" стану (нормальна гра ніколи так не
    // прийде), але важливо, щоб код перевіряв ТИП фігури, а не лише
    // клітинку — інакше ферзь, що випадково опинився на h8, забрав би
    // чуже право bK, хоча чорна тура там ще стоїть.
    const state = {
      board: { h8: 'Q' },
      selectedSquare: 'h8',
      history: [],
      plyCount: 1,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'h8', to: 'h4', piece: 'Q' }));

    expect(next.castlingRights).toMatchObject({ bK: true });
  });

  it('взяття тури суперника на її стартовій клітинці теж відбирає право', () => {
    const state = {
      board: { h8: 'Q', a8: 'r' },
      selectedSquare: 'h8',
      history: [],
      plyCount: 1,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    // Ферзь іде h8 -> a8, "з'їдаючи" чорну туру на її стартовій клітинці.
    const next = gameReducer(state, moveExecuted({ from: 'h8', to: 'a8', piece: 'Q' }));

    expect(next.castlingRights).toMatchObject({ bQ: false, bK: true });
  });

  it('хід пішака на 2 клітинки встановлює enPassantTarget на клітинку позаду нього', () => {
    const state = {
      board: { e2: 'P' },
      selectedSquare: 'e2',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));

    expect(next.enPassantTarget).toBe('e3');
  });

  it('будь-який інший хід скидає enPassantTarget назад у null', () => {
    const state = {
      board: { a1: 'R' },
      selectedSquare: 'a1',
      history: [],
      plyCount: 2,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: 'e3', // залишок від минулого напівходу
    };

    const next = gameReducer(state, moveExecuted({ from: 'a1', to: 'a4', piece: 'R' }));

    expect(next.enPassantTarget).toBeNull();
  });

  it('взяття на проході знімає пішака-жертву, а не клітинку `to`', () => {
    // Чорний щойно пішов d7-d5 (enPassantTarget='d6'); білий пішак e5 бере на проході.
    const state = {
      board: { e5: 'P', d5: 'p' },
      selectedSquare: 'e5',
      history: [],
      plyCount: 3,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: 'd6',
    };

    const next = gameReducer(state, moveExecuted({ from: 'e5', to: 'd6', piece: 'P' }));

    expect(next.board).toEqual({ d6: 'P' }); // d5 (жертва) зникла, d6 порожня клітинка зайнята
    expect(next.history[0].captured).toBe('p');
    expect(next.history[0].enPassant).toBe(true);
  });
});

// Крок 6 (docs/move-validation.md, розділ 5): промоція пішака.
describe('gameSlice: moveExecuted — крок 6 (промоція)', () => {
  it('за замовчуванням промотує в ферзя, якщо promotion не вказано', () => {
    const state = {
      board: { a7: 'P' },
      selectedSquare: 'a7',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'a7', to: 'a8', piece: 'P' }));

    expect(next.board).toEqual({ a8: 'Q' });
    expect(next.history[0].promotion).toBe('Q');
  });

  it('промотує в обрану фігуру, зберігаючи регістр кольору', () => {
    const state = {
      board: { a2: 'p' },
      selectedSquare: 'a2',
      history: [],
      plyCount: 1,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'a2', to: 'a1', piece: 'p', promotion: 'R' })
    );

    expect(next.board).toEqual({ a1: 'r' });
    expect(next.history[0].promotion).toBe('R');
  });

  it('звичайний хід пішака (не на останній ряд) не встановлює promotion', () => {
    const state = {
      board: { a6: 'P' },
      selectedSquare: 'a6',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'a6', to: 'a7', piece: 'P' }));

    expect(next.board).toEqual({ a7: 'P' });
    expect(next.history[0].promotion).toBeNull();
  });

  it('взяття фігури на останньому ряду з одночасною промоцією записує ОБИДВА поля', () => {
    const state = {
      board: { b7: 'P', a8: 'n' },
      selectedSquare: 'b7',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(
      state,
      moveExecuted({ from: 'b7', to: 'a8', piece: 'P', promotion: 'Q' })
    );

    expect(next.board).toEqual({ a8: 'Q' });
    expect(next.history[0].captured).toBe('n');
    expect(next.history[0].promotion).toBe('Q');
  });
});

// Крок 7 (docs/move-validation.md, розділ 5): SAN + isCheck/isCheckmate
// записуються прямо в history одразу під час виконання ходу.
describe('gameSlice: moveExecuted — крок 7 (нотація)', () => {
  it('записує san для звичайного тихого ходу', () => {
    const state = {
      board: { e2: 'P' },
      selectedSquare: 'e2',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));

    expect(next.history[0].san).toBe('e4');
    expect(next.history[0].isCheck).toBe(false);
    expect(next.history[0].isCheckmate).toBe(false);
  });

  it('san містить "x" для взяття', () => {
    const state = {
      board: { e4: 'P', d5: 'p' },
      selectedSquare: 'e4',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e4', to: 'd5', piece: 'P' }));

    expect(next.history[0].san).toBe('exd5');
  });

  it('san отримує суфікс "+", якщо хід дає шах суперникові', () => {
    // Тура йде на відкритий 8-й ряд і одразу шахує короля по рангу.
    const state = {
      board: { a1: 'R', e8: 'k' },
      selectedSquare: 'a1',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'a1', to: 'a8', piece: 'R' }));

    expect(next.history[0].san).toBe('Ra8+');
    expect(next.history[0].isCheck).toBe(true);
    expect(next.history[0].isCheckmate).toBe(false);
  });

  it('san отримує суфікс "#" на матовій позиції (back-rank mate)', () => {
    const state = {
      board: { g1: 'K', f2: 'P', g2: 'P', h2: 'P', a2: 'r' },
      selectedSquare: 'a2',
      history: [],
      plyCount: 1,
      castlingRights: NO_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'a2', to: 'a1', piece: 'r' }));

    expect(next.history[0].san).toBe('Ra1#');
    expect(next.history[0].isCheckmate).toBe(true);
  });

  it('рокіровка отримує san "O-O", а не "Kg1"', () => {
    const state = {
      board: { e1: 'K', h1: 'R' },
      selectedSquare: 'e1',
      history: [],
      plyCount: 0,
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e1', to: 'g1', piece: 'K' }));

    expect(next.history[0].san).toBe('O-O');
  });
});

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
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e7', to: 'e5', piece: 'p' }));

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
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));

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
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e7', to: 'e5', piece: 'p' }));

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
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));

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
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e7', to: 'e5', piece: 'p' }));

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
      castlingRights: FULL_CASTLING_RIGHTS,
      enPassantTarget: null,
    };

    const next = gameReducer(state, moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));

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
      endGame({ winner: COLORS.WHITE, reason: 'timeout', timedOutColor: COLORS.BLACK })
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

    const next = gameReducer(state, endGame({ winner: COLORS.WHITE, reason: 'checkmate' }));

    expect(next.whiteTime).toBe(42000);
    expect(next.blackTime).toBe(99000);
    expect(next.turnStartedAt).toBeNull();
  });
});
