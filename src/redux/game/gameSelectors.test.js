import { describe, it, expect, vi, afterEach } from 'vitest';
import { selectMovePairs, selectClockRemaining } from './gameSelectors';
import { COLORS } from './gameConstants';

// docs/move-notation.md, розділ 7: групування history в пари для UI списку
// ходів (docs/move-notation.md, розділ 8).
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
      { number: 1, white: { piece: 'P', san: 'e4' }, black: { piece: 'p', san: 'e5' } },
    ]);
  });

  it('повертає ТОЙ САМИЙ референс масиву при повторному виклику з тим самим `history` (мемоізація)', () => {
    // Регресія на попередження react-redux "Selector ... returned a
    // different result when called with the same parameters" — воно
    // з'явилось, поки центральний тікер годинника (перша версія
    // docs/clock-and-game-record.md) форсував перерендер кілька разів на
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
      { number: 1, white: { piece: 'P', san: 'e4' }, black: { piece: 'p', san: 'e5' } },
      { number: 2, white: { piece: 'N', san: 'Nf3' }, black: null },
    ]);
  });
});

// docs/clock-and-game-record.md, розділ 5.2 / крок 2: годинник на
// глобальному відліку часу — "скільки лишилось" завжди РАХУЄТЬСЯ від
// Date.now(), а не читається як уже готове число зі стору.
describe('selectClockRemaining', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const baseGame = {
    whiteTime: 180000,
    blackTime: 180000,
    plyCount: 1, // хід чорних (непарний plyCount)
    isGameOver: false,
    turnStartedAt: 1_000_000,
  };

  it('для НЕактивної сторони повертає сире значення без змін, незалежно від часу', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_050_000); // +50с від turnStartedAt

    const state = { game: baseGame }; // хід чорних — білі зараз не активні
    expect(selectClockRemaining(state, COLORS.WHITE)).toBe(180000);
  });

  it('для активної сторони віднімає рівно стільки, скільки реально минуло', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = { game: baseGame };
    vi.setSystemTime(1_004_230); // +4.23с

    expect(selectClockRemaining(state, COLORS.BLACK)).toBe(180000 - 4230);
  });

  it('не йде нижче нуля, навіть якщо минуло більше, ніж лишалось', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = { game: { ...baseGame, blackTime: 500 } };
    vi.setSystemTime(1_010_000); // +10с — набагато більше за залишок

    expect(selectClockRemaining(state, COLORS.BLACK)).toBe(0);
  });

  it('якщо гра ще не почалась (plyCount: 0), жоден колір не "running" — навіть якщо turnStartedAt чомусь заданий', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_050_000);

    const state = { game: { ...baseGame, plyCount: 0 } };

    expect(selectClockRemaining(state, COLORS.WHITE)).toBe(180000);
    expect(selectClockRemaining(state, COLORS.BLACK)).toBe(180000);
  });

  it('якщо гра завершена (isGameOver: true), годинники "заморожені" — час далі не спливає', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_050_000);

    const state = { game: { ...baseGame, isGameOver: true } };

    expect(selectClockRemaining(state, COLORS.BLACK)).toBe(180000);
  });
});
