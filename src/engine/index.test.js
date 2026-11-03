import { describe, it, expect } from 'vitest';
import {
  applyMove,
  getLegalMoves,
  isMoveLegal,
  getStatus,
  toSan,
} from './index';
import { makeGameState, NO_CASTLING } from '../test/fixtures';

// Тести публічного контракту фасаду — імпорт лише з './index'.
describe('engine facade', () => {
  describe('getLegalMoves', () => {
    it('порожня клітинка → []', () => {
      const position = makeGameState({ e1: 'K', e8: 'k' });

      expect(getLegalMoves(position, 'e4')).toEqual([]);
    });

    it('кінь у центрі → усі 8 полів', () => {
      const position = makeGameState({ e1: 'K', d4: 'N' });

      expect(getLegalMoves(position, 'd4').sort()).toEqual(
        ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'].sort()
      );
    });

    it('поле зі своєю фігурою не потрапляє в список', () => {
      const position = makeGameState({ e1: 'K', d4: 'N', f5: 'P' });

      expect(getLegalMoves(position, 'd4')).not.toContain('f5');
    });

    it("фігура у зв'язці не має ходів, що відкривають короля", () => {
      // Слон e2 закриває короля e1 від тури e8 — з вертикалі не піде.
      const position = makeGameState({ e1: 'K', e2: 'B', e8: 'r' });

      expect(getLegalMoves(position, 'e2')).toEqual([]);
    });

    it('король з правом рокіровки → є g1', () => {
      const position = makeGameState({ e1: 'K', h1: 'R' });

      expect(getLegalMoves(position, 'e1')).toContain('g1');
    });

    it('король без права рокіровки → немає g1', () => {
      const position = makeGameState(
        { e1: 'K', h1: 'R' },
        { castlingRights: NO_CASTLING }
      );

      expect(getLegalMoves(position, 'e1')).not.toContain('g1');
    });

    it('пішак з ціллю en passant → є взяття на проході', () => {
      const position = makeGameState(
        { e1: 'K', e5: 'P', d5: 'p', e8: 'k' },
        { enPassantTarget: 'd6' }
      );

      expect(getLegalMoves(position, 'e5')).toContain('d6');
    });
  });

  describe('isMoveLegal', () => {
    it('true для легального ходу, false для нелегального', () => {
      const position = makeGameState({ e1: 'K', e2: 'P', e8: 'k' });

      expect(isMoveLegal(position, 'e2', 'e4')).toBe(true);
      expect(isMoveLegal(position, 'e2', 'e5')).toBe(false);
    });
  });

  describe('getStatus', () => {
    const noCastling = (board) =>
      makeGameState(board, { castlingRights: NO_CASTLING });

    it('звичайна позиція → ні шаху, ні мату, ні пату', () => {
      expect(getStatus(noCastling({ e1: 'K', e8: 'k' }), 'w')).toEqual({
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
      });
    });

    it('шах із втечею → лише isCheck', () => {
      const position = noCastling({ e1: 'K', e5: 'r', a8: 'k' });

      expect(getStatus(position, 'w')).toEqual({
        isCheck: true,
        isCheckmate: false,
        isStalemate: false,
      });
    });

    it('мат по останньому ряду → isCheck і isCheckmate', () => {
      // Тура e1 б'є f1/h1, на f2/g2/h2 — власні пішаки.
      const position = noCastling({
        g1: 'K',
        f2: 'P',
        g2: 'P',
        h2: 'P',
        e1: 'r',
        a8: 'k',
      });

      expect(getStatus(position, 'w')).toEqual({
        isCheck: true,
        isCheckmate: true,
        isStalemate: false,
      });
    });

    it('пат → лише isStalemate', () => {
      // Ферзь b6 закриває a7, b7, b8, але сам a8 не атакує.
      const position = noCastling({ a8: 'k', b6: 'Q', e1: 'K' });

      expect(getStatus(position, 'b')).toEqual({
        isCheck: false,
        isCheckmate: false,
        isStalemate: true,
      });
    });
  });

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
