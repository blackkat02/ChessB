import { describe, it, expect } from 'vitest';
import { countPieces, findKing, piecesOf, movePiece } from './board';

// Невелика позиція для більшості тестів:
//   білі: король e1, пішак e2, тура a1
//   чорні: король e8, ферзь d8
const position = { e1: 'K', e2: 'P', a1: 'R', e8: 'k', d8: 'q' };

describe('Задача 1: countPieces', () => {
  it('порожня дошка — 0', () => {
    expect(countPieces({})).toBe(0);
  });

  it('рахує всі фігури обох кольорів', () => {
    expect(countPieces(position)).toBe(5);
  });

  it('одна фігура — 1', () => {
    expect(countPieces({ h8: 'k' })).toBe(1);
  });
});

describe('Задача 2: findKing', () => {
  it('знаходить білого короля', () => {
    expect(findKing(position, 'w')).toBe('e1');
  });

  it('знаходить чорного короля', () => {
    expect(findKing(position, 'b')).toBe('e8');
  });

  it('не плутає короля з іншими фігурами того ж кольору', () => {
    expect(findKing({ a1: 'Q', b1: 'R', h1: 'K' }, 'w')).toBe('h1');
  });

  it('короля немає — null (не undefined)', () => {
    expect(findKing({ e2: 'P' }, 'w')).toBe(null);
  });

  it('порожня дошка — null', () => {
    expect(findKing({}, 'b')).toBe(null);
  });
});

describe('Задача 3: piecesOf', () => {
  it('клітинки білих фігур', () => {
    // Порядок ключів у об'єкті — не те, на що варто покладатися,
    // тому сортуємо перед порівнянням.
    expect(piecesOf(position, 'w').sort()).toEqual(['a1', 'e1', 'e2']);
  });

  it('клітинки чорних фігур', () => {
    expect(piecesOf(position, 'b').sort()).toEqual(['d8', 'e8']);
  });

  it('повертає масив, навіть якщо фігур цього кольору немає', () => {
    expect(piecesOf({ e1: 'K' }, 'b')).toEqual([]);
  });

  it('порожня дошка — порожній масив', () => {
    expect(piecesOf({}, 'w')).toEqual([]);
  });
});

describe('Задача 4: movePiece', () => {
  it('фігура опиняється на новій клітинці, стара клітинка порожня', () => {
    const result = movePiece({ e2: 'P', e8: 'k' }, 'e2', 'e4');
    expect(result).toEqual({ e4: 'P', e8: 'k' });
  });

  it('порожня клітинка — це відсутній ключ, а не null чи undefined', () => {
    const result = movePiece({ e2: 'P' }, 'e2', 'e4');
    expect('e2' in result).toBe(false);
  });

  it('взяття: фігура на цільовій клітинці замінюється', () => {
    const result = movePiece({ d1: 'Q', d8: 'q' }, 'd1', 'd8');
    expect(result).toEqual({ d8: 'Q' });
  });

  it('НЕ змінює вхідну дошку', () => {
    const board = { e2: 'P', e8: 'k' };
    const result = movePiece(board, 'e2', 'e4');
    expect(result.e4).toBe('P'); // хід справді зроблено...
    expect(board).toEqual({ e2: 'P', e8: 'k' }); // ...але не на вхідній дошці
  });

  it("повертає НОВИЙ об'єкт, а не той самий", () => {
    const board = { e2: 'P' };
    const result = movePiece(board, 'e2', 'e4');
    expect(typeof result).toBe('object');
    expect(result).not.toBe(board);
  });
});
