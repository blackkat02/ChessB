import { describe, it, expect } from 'vitest';
import {
  isCheck,
  getAllLegalMoves,
  isCheckmate,
  isStalemate,
  getNonKingPieces,
  isInsufficientMaterial,
  getSquareColor,
  canCheckmate,
} from './gameStatus';
import { makeGameState, NO_CASTLING } from '../test/fixtures';

describe('isCheck', () => {
  it('немає шаху на порожній дошці (немає навіть короля)', () => {
    expect(isCheck({}, 'w')).toBe(false);
  });

  it('король під шахом ферзя по прямій', () => {
    expect(isCheck({ e1: 'K', e2: 'q' }, 'w')).toBe(true);
  });

  it('король не під шахом, якщо атакуюча фігура заблокована', () => {
    // Ферзь на e5 шахував би по e-файлу, але пішак на e3 стоїть МІЖ ним і
    // королем — промінь до e1 не доходить.
    expect(isCheck({ e1: 'K', e3: 'p', e5: 'q' }, 'w')).toBe(false);
  });
});

describe('getAllLegalMoves', () => {
  it('позиція із шахом і ЄДИНИМ рятівним ходом — узяти фігуру, що дає шах', () => {
    // Чорний ферзь на e2 шахує короля e1; жодна інша клітинка навколо
    // короля не безпечна (усі під боєм того самого ферзя), крім e2 самого —
    // ферзь нічим не захищений, тому Kxe2 рятує партію.
    const gameState = makeGameState({ e1: 'K', e2: 'q' });
    const moves = getAllLegalMoves(gameState, 'w');

    expect(moves).toEqual([{ from: 'e1', to: 'e2' }]);
  });

  it('агрегує ходи з усіх фігур одного кольору, а не лише однієї', () => {
    const gameState = makeGameState({ e1: 'K', a1: 'R' });
    const moves = getAllLegalMoves(gameState, 'w');

    const fromSquares = new Set(moves.map((move) => move.from));
    expect(fromSquares).toEqual(new Set(['e1', 'a1']));
  });

  it('включає рокіровку для короля, якщо вона легальна', () => {
    const gameState = makeGameState(
      { e1: 'K', h1: 'R' },
      { castlingRights: { ...NO_CASTLING, whiteShort: true } }
    );
    const moves = getAllLegalMoves(gameState, 'w');

    expect(moves).toContainEqual({ from: 'e1', to: 'g1' });
  });
});

describe('isCheckmate', () => {
  it('класичний мат на останньому ряду (back-rank mate)', () => {
    // Білий король заблокований власними пішаками f2/g2/h2, чорна тура
    // шахує по 1-му ряду — жодна клітинка (f1 чи h1) не безпечна.
    const gameState = makeGameState({
      g1: 'K',
      f2: 'P',
      g2: 'P',
      h2: 'P',
      a1: 'r',
    });

    expect(isCheckmate(gameState, 'w')).toBe(true);
  });

  it('шах є, але лишається рятівний хід — це НЕ мат', () => {
    const gameState = makeGameState({ e1: 'K', e2: 'q' });
    expect(isCheckmate(gameState, 'w')).toBe(false);
  });

  it('немає легальних ходів, але й немає шаху — це НЕ мат (це пат)', () => {
    const gameState = makeGameState({ a8: 'k', b6: 'Q', c7: 'K' });
    expect(isCheckmate(gameState, 'b')).toBe(false);
  });
});

describe('isStalemate', () => {
  it('класична позиція пату: ферзь+король проти самотнього короля в куті', () => {
    // Чорний король a8: a7 і b6 під боєм ферзя, b8 під боєм короля c7 —
    // жодного ходу, і при цьому чорний король НЕ під шахом.
    const gameState = makeGameState({ a8: 'k', b6: 'Q', c7: 'K' });

    expect(isCheck(gameState.board, 'b')).toBe(false);
    expect(isStalemate(gameState, 'b')).toBe(true);
  });

  it('мат — це НЕ пат (є шах)', () => {
    const gameState = makeGameState({
      g1: 'K',
      f2: 'P',
      g2: 'P',
      h2: 'P',
      a1: 'r',
    });
    expect(isStalemate(gameState, 'w')).toBe(false);
  });

  it('звичайна позиція з легальними ходами — ні мат, ні пат', () => {
    const gameState = makeGameState({ e1: 'K', a1: 'R', e8: 'k' });
    expect(isCheckmate(gameState, 'w')).toBe(false);
    expect(isStalemate(gameState, 'w')).toBe(false);
  });
});

describe('getNonKingPieces', () => {
  const kings = { e1: 'K', e8: 'k' };

  it('лише королі — порожній масив', () => {
    expect(getNonKingPieces(kings)).toEqual([]);
  });

  it('король і кінь — масив з одного коня', () => {
    expect(getNonKingPieces({ ...kings, c3: 'N' })).toEqual(['N']);
  });

  it('фігури обох кольорів — усі, крім королів', () => {
    expect(
      getNonKingPieces({ ...kings, c3: 'N', d5: 'p', a8: 'r' })
    ).toHaveLength(3);
  });
});

describe('isInsufficientMaterial', () => {
  const kings = { e1: 'K', e8: 'k' };

  it('король проти короля — true', () => {
    expect(isInsufficientMaterial(kings)).toBe(true);
  });

  it('король і кінь — true', () => {
    expect(isInsufficientMaterial({ ...kings, c3: 'N' })).toBe(true);
  });

  it('король і чорний слон — true', () => {
    expect(isInsufficientMaterial({ ...kings, f8: 'b' })).toBe(true);
  });

  it('король і 3 чорних слона з одноколірними полями — true', () => {
    expect(
      isInsufficientMaterial({ ...kings, f8: 'b', f6: 'b', f4: 'b' })
    ).toBe(true);
  });

  it('слони на клітинках різного кольору — false', () => {
    expect(isInsufficientMaterial({ ...kings, c1: 'B', c8: 'b' })).toBe(false);
  });

  it('слони одного кольору, але є пішак — false', () => {
    expect(
      isInsufficientMaterial({ ...kings, c1: 'B', c7: 'b', e4: 'P' })
    ).toBe(false);
  });

  it('король і 3 чорних слона та 1 білий з одноколірними полями — true', () => {
    expect(
      isInsufficientMaterial({ ...kings, f8: 'b', f6: 'b', f4: 'b', f2: 'B' })
    ).toBe(true);
  });

  it('є пішак — false', () => {
    expect(isInsufficientMaterial({ ...kings, e2: 'P' })).toBe(false);
  });

  it('є тура — false', () => {
    expect(isInsufficientMaterial({ ...kings, e5: 'r' })).toBe(false);
  });

  it('два коні — false', () => {
    expect(isInsufficientMaterial({ ...kings, b2: 'n', f2: 'N' })).toBe(false);
  });

  it('слон проти коня — false', () => {
    expect(isInsufficientMaterial({ ...kings, b2: 'b', f2: 'N' })).toBe(false);
  });
});

describe('getSquareColor', () => {
  it('a1 — dark', () => {
    expect(getSquareColor('a1')).toBe('dark');
  });

  it('h1 — light', () => {
    expect(getSquareColor('h1')).toBe('light');
  });

  it('d4 — dark', () => {
    expect(getSquareColor('a1')).toBe('dark');
  });

  it('h1 — light', () => {
    expect(getSquareColor('h1')).toBe('light');
  });
});

describe('canCheckmate', () => {
  it('в чорних лише король — false', () => {
    expect(canCheckmate({ e1: 'K', a2: 'P', e8: 'k' }, 'b')).toBe(false);
  });

  it('на дошці лише королі — false', () => {
    expect(canCheckmate({ e1: 'K', e8: 'k' }, 'w')).toBe(false);
  });

  it('в білих є слони однопольні — false', () => {
    expect(canCheckmate({ e1: 'K', a2: 'B', a4: 'B', e8: 'k' }, 'w')).toBe(
      false
    );
  });

  it('у білих пішак — true', () => {
    expect(canCheckmate({ e1: 'K', a2: 'P', e8: 'k' }, 'w')).toBe(true);
  });
});
