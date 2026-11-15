import { describe, it, expect } from 'vitest';
import { getTargetMark } from './targetMark';

const board = { e2: 'P', d5: 'p', e1: 'K', e8: 'k' };
const legalTargets = ['e3', 'e4', 'd5'];

describe('getTargetMark', () => {
  it('порожня легальна клітинка — точка', () => {
    expect(getTargetMark(legalTargets, board, 'e3')).toBe('move');
  });

  it('легальна клітинка з фігурою — кільце', () => {
    expect(getTargetMark(legalTargets, board, 'd5')).toBe('capture');
  });

  it('клітинки немає в списку — null', () => {
    expect(getTargetMark(legalTargets, board, 'a1')).toBe(null);
  });

  it('клітинки немає в списку, хоч на ній є фігура — null', () => {
    expect(getTargetMark(legalTargets, board, 'e2')).toBe(null);
  });

  it('порожній список — null для будь-якої клітинки', () => {
    expect(getTargetMark([], board, 'e3')).toBe(null);
  });
});
