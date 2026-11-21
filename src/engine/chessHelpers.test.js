import { describe, it, expect } from 'vitest';
import { getPieceType } from './chessHelpers';

describe('getPieceType', () => {
  it('біла фігура — та сама літера', () => {
    expect(getPieceType('P')).toBe('P');
    expect(getPieceType('K')).toBe('K');
  });

  it('чорна фігура — велика літера', () => {
    expect(getPieceType('p')).toBe('P');
    expect(getPieceType('n')).toBe('N');
  });

  it('порожня клітинка — null', () => {
    expect(getPieceType(undefined)).toBe(null);
    expect(getPieceType(null)).toBe(null);
  });
});
