import { describe, it, expect } from 'vitest';
import {
  applyMove,
  nextCastlingRights,
  nextEnPassantTarget,
  getCastlingRookMove,
} from './applyMove';

const ALL_RIGHTS = {
  whiteShort: true,
  whiteLong: true,
  blackShort: true,
  blackLong: true,
};

/**
 * @param {any} board
 */
function makePosition(board, overrides = {}) {
  return {
    board,
    castlingRights: { ...ALL_RIGHTS },
    enPassantTarget: null,
    ...overrides,
  };
}

describe('applyMove', () => {
  describe('nextEnPassantTarget', () => {
    it('білий пішак на 2 клітинки → ціль на пропущеній клітинці', () => {
      expect(nextEnPassantTarget({ piece: 'P', from: 'e2', to: 'e4' })).toBe(
        'e3'
      );
    });

    it('чорний пішак на 2 клітинки → ціль на пропущеній клітинці', () => {
      expect(nextEnPassantTarget({ piece: 'p', from: 'd7', to: 'd5' })).toBe(
        'd6'
      );
    });

    it('пішак на 1 клітинку → null', () => {
      expect(
        nextEnPassantTarget({ piece: 'P', from: 'e2', to: 'e3' })
      ).toBeNull();
    });

    it('не пішак, навіть на 2 ряди → null', () => {
      expect(
        nextEnPassantTarget({ piece: 'R', from: 'a1', to: 'a3' })
      ).toBeNull();
    });
  });

  describe('getCastlingRookMove', () => {
    describe('рокіровка → хід тури', () => {
      it('коротка рокіровка білих (e1→g1) → тура h1→f1', () => {
        expect(getCastlingRookMove('K', 'e1', 'g1')).toEqual({
          from: 'h1',
          to: 'f1',
          side: 'K',
        });
      });

      it('довга рокіровка білих (e1→c1) → тура a1→d1', () => {
        expect(getCastlingRookMove('K', 'e1', 'c1')).toEqual({
          from: 'a1',
          to: 'd1',
          side: 'Q',
        });
      });

      it('коротка рокіровка чорних (e8→g8) → тура h8→f8', () => {
        expect(getCastlingRookMove('k', 'e8', 'g8')).toEqual({
          from: 'h8',
          to: 'f8',
          side: 'K',
        });
      });

      it('довга рокіровка чорних (e8→c8) → тура a8→d8', () => {
        expect(getCastlingRookMove('k', 'e8', 'c8')).toEqual({
          from: 'a8',
          to: 'd8',
          side: 'Q',
        });
      });
    });

    describe('не рокіровка → null', () => {
      it('король ходить на 1 клітинку', () => {
        expect(getCastlingRookMove('K', 'e1', 'f1')).toBeNull();
        expect(getCastlingRookMove('k', 'e8', 'd8')).toBeNull();
      });

      it('король не на стартовій клітинці', () => {
        expect(getCastlingRookMove('K', 'd1', 'f1')).toBeNull();
      });

      it('король іде не на клітинку рокіровки', () => {
        expect(getCastlingRookMove('K', 'e1', 'g3')).toBeNull();
      });

      it('не король, навіть з e1 на g1 (тура/ферзь)', () => {
        expect(getCastlingRookMove('R', 'e1', 'g1')).toBeNull();
        expect(getCastlingRookMove('Q', 'e1', 'c1')).toBeNull();
      });
    });
  });
});
