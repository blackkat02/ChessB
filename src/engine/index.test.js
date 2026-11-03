import { describe, it, expect } from 'vitest';
import { applyMove, getStatus, toSan } from './index';
import { makeGameState, NO_CASTLING } from '../test/fixtures';

// Тести публічного контракту фасаду — імпорт лише з './index'.
describe('engine facade', () => {
  describe('toSan', () => {
    it('разом з applyMove і getStatus дає "exd5"', () => {
      const before = makeGameState(
        { e1: 'K', e8: 'k', e4: 'P', d5: 'p' },
        { castlingRights: NO_CASTLING }
      );
      const move = { from: 'e4', to: 'd5', piece: 'P' };

      const { position: after, details } = applyMove(before, move);
      const status = getStatus(after, 'b');

      expect(toSan(before, { ...move, ...details }, status)).toBe('exd5');
    });
  });
});
