import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  selectMovePairs,
  selectClockRemaining,
  selectLegalTargets,
} from './gameSelectors';
import { COLORS } from './gameConstants';

// docs/archive/move-notation.md, розділ 7: групування history в пари для UI списку
// ходів (docs/archive/move-notation.md, розділ 8).
describe('selectMovePairs', () => {
  it('порожня історія — порожній список пар', () => {
    expect(selectMovePairs({ game: { history: [] } })).toEqual([]);
  });

  it('один хід білих без відповіді чорних', () => {
    const state = { game: { history: [{ piece: 'P', san: 'e4' }] } };
    expect(selectMovePairs(state)).toEqual([
      { number: 1, white: { piece: 'P', san: 'e4' }, black: null },
    ]);
  });

  it('повна пара хід білих + хід чорних', () => {
    const state = {
      game: {
        history: [
          { piece: 'P', san: 'e4' },
          { piece: 'p', san: 'e5' },
        ],
      },
    };
    expect(selectMovePairs(state)).toEqual([
      {
        number: 1,
        white: { piece: 'P', san: 'e4' },
        black: { piece: 'p', san: 'e5' },
      },
    ]);
  });

  it('повертає ТОЙ САМИЙ референс масиву при повторному виклику з тим самим `history` (мемоізація)', () => {
    // Регресія на попередження react-redux "Selector ... returned a
    // different result when called with the same parameters" — воно
    // з'явилось, поки центральний тікер годинника (перша версія
    // docs/archive/clock-and-game-record.md) форсував перерендер кілька разів на
    // секунду, а немемоізований селектор щоразу повертав новий масив через
    // .reduce(..., []).
    const state = { game: { history: [{ piece: 'P', san: 'e4' }] } };

    expect(selectMovePairs(state)).toBe(selectMovePairs(state));
  });

  it('декілька пар підряд, остання неповна', () => {
    const state = {
      game: {
        history: [
          { piece: 'P', san: 'e4' },
          { piece: 'p', san: 'e5' },
          { piece: 'N', san: 'Nf3' },
        ],
      },
    };
    expect(selectMovePairs(state)).toEqual([
      {
        number: 1,
        white: { piece: 'P', san: 'e4' },
        black: { piece: 'p', san: 'e5' },
      },
      { number: 2, white: { piece: 'N', san: 'Nf3' }, black: null },
    ]);
  });
});

// docs/archive/clock-and-game-record.md, розділ 5.2 / крок 2: годинник на
// глобальному відліку часу — "скільки лишилось" завжди РАХУЄТЬСЯ від
// Date.now(), а не читається як уже готове число зі стору.
describe('selectClockRemaining', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const baseGame = {
    whiteTime: 180000,
    blackTime: 180000,
    plyCount: 1,
    isGameOver: false,
    turnStartedAt: 1_000_000,
  };
  // Черга — у позиції (docs/layer-separation-step4.md, 4.4).
  const blackToMove = { turn: 'b' };

  it('для НЕактивної сторони повертає сире значення без змін, незалежно від часу', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_050_000); // +50с від turnStartedAt

    const state = { game: baseGame, position: blackToMove }; // білі зараз не активні
    expect(selectClockRemaining(state, COLORS.WHITE)).toBe(180000);
  });

  it('для активної сторони віднімає рівно стільки, скільки реально минуло', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = { game: baseGame, position: blackToMove };
    vi.setSystemTime(1_004_230); // +4.23с

    expect(selectClockRemaining(state, COLORS.BLACK)).toBe(180000 - 4230);
  });

  it('не йде нижче нуля, навіть якщо минуло більше, ніж лишалось', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = {
      game: { ...baseGame, blackTime: 500 },
      position: blackToMove,
    };
    vi.setSystemTime(1_010_000); // +10с — набагато більше за залишок

    expect(selectClockRemaining(state, COLORS.BLACK)).toBe(0);
  });

  it('якщо гра ще не почалась (plyCount: 0), жоден колір не "running" — навіть якщо turnStartedAt чомусь заданий', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_050_000);

    const state = {
      game: { ...baseGame, plyCount: 0 },
      position: blackToMove,
    };

    expect(selectClockRemaining(state, COLORS.WHITE)).toBe(180000);
    expect(selectClockRemaining(state, COLORS.BLACK)).toBe(180000);
  });

  it('якщо гра завершена (isGameOver: true), годинники "заморожені" — час далі не спливає', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_050_000);

    const state = {
      game: { ...baseGame, isGameOver: true },
      position: blackToMove,
    };

    expect(selectClockRemaining(state, COLORS.BLACK)).toBe(180000);
  });
});

describe('selectLegalTargets', () => {
  it('нічого не вибрано — порожній список', () => {
    const state = {
      position: { board: {}, castlingRights: {}, enPassantTarget: null },
      ui: { selectedSquare: null },
    };

    const targets = selectLegalTargets(state);

    expect([...targets].sort()).toEqual([]);
  });

  it('вибраний кінь — повертає всі клітинки, куди він може піти', () => {
    const state = {
      position: {
        board: { e1: 'K', g1: 'N', e8: 'k' },
        castlingRights: {},
        enPassantTarget: null,
      },
      ui: { selectedSquare: 'g1' },
    };

    const targets = selectLegalTargets(state);

    expect([...targets].sort()).toEqual(['e2', 'f3', 'h3']);
  });

  it("слон у зв'язці з королем — жодного легального ходу", () => {
    const state = {
      position: {
        board: { e1: 'K', e2: 'B', e8: 'r', b8: 'k' },
        castlingRights: {},
        enPassantTarget: null,
      },
      ui: { selectedSquare: 'e2' },
    };

    const targets = selectLegalTargets(state);

    expect([...targets].sort()).toEqual([]);
  });

  it("тура у зв'язці з королем — має легальні ходи тільки по вертикалі", () => {
    const state = {
      position: {
        board: { e1: 'K', e2: 'R', e5: 'r', b8: 'k' },
        castlingRights: {},
        enPassantTarget: null,
      },
      ui: { selectedSquare: 'e2' },
    };

    const targets = selectLegalTargets(state);

    expect([...targets].sort()).toEqual(['e3', 'e4', 'e5']);
  });

  it('той самий стан — той самий масив (мемоізація)', () => {
    const state = {
      position: {
        board: { e1: 'K', e2: 'N', c8: 'r', a8: 'k' },
        castlingRights: {},
        enPassantTarget: null,
      },
      ui: { selectedSquare: 'e2' },
    };

    expect(selectLegalTargets(state)).toBe(selectLegalTargets(state));
  });
});
