import { describe, it, expect } from 'vitest';
import gameReducer, { moveExecuted } from './gameSlice';

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
