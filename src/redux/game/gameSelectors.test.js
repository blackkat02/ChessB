import { describe, it, expect } from 'vitest';
import { selectMovePairs } from './gameSelectors';

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
