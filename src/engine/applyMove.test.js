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

  describe('nextCastlingRights', () => {
    describe('хід короля → втрата обох прав свого кольору', () => {
      it('коротка рокіровка білих (e1→g1)', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'K', from: 'e1', to: 'g1' })
        ).toEqual({ ...ALL_RIGHTS, whiteShort: false, whiteLong: false });
      });

      it('довга рокіровка чорних (e8→c8)', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'k', from: 'e8', to: 'c8' })
        ).toEqual({ ...ALL_RIGHTS, blackShort: false, blackLong: false });
      });

      it('звичайний хід білого короля (e1→e2)', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'K', from: 'e1', to: 'e2' })
        ).toEqual({ ...ALL_RIGHTS, whiteShort: false, whiteLong: false });
      });

      it('звичайний хід чорного короля (e8→f7)', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'k', from: 'e8', to: 'f7' })
        ).toEqual({ ...ALL_RIGHTS, blackShort: false, blackLong: false });
      });
    });

    describe('хід тури зі стартової клітинки → втрата відповідного права', () => {
      it('біла тура з h1 → whiteShort = false', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'R', from: 'h1', to: 'h4' })
        ).toEqual({ ...ALL_RIGHTS, whiteShort: false });
      });

      it('біла тура з a1 → whiteLong = false', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'R', from: 'a1', to: 'a4' })
        ).toEqual({ ...ALL_RIGHTS, whiteLong: false });
      });

      it('чорна тура з h8 → blackShort = false', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'r', from: 'h8', to: 'h5' })
        ).toEqual({ ...ALL_RIGHTS, blackShort: false });
      });

      it('чорна тура з a8 → blackLong = false', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'r', from: 'a8', to: 'a5' })
        ).toEqual({ ...ALL_RIGHTS, blackLong: false });
      });

      it('тура не зі стартової клітинки → права не змінюються', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'R', from: 'd4', to: 'd5' })
        ).toEqual(ALL_RIGHTS);
      });
    });

    describe('взяття на стартовій клітинці тури → втрата права суперника', () => {
      it('чорний слон бере на h1 → whiteShort = false', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'b', from: 'b7', to: 'h1' })
        ).toEqual({ ...ALL_RIGHTS, whiteShort: false });
      });

      it('чорний ферзь бере на a1 → whiteLong = false', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'q', from: 'a4', to: 'a1' })
        ).toEqual({ ...ALL_RIGHTS, whiteLong: false });
      });

      it('білий слон бере на h8 → blackShort = false', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'B', from: 'b2', to: 'h8' })
        ).toEqual({ ...ALL_RIGHTS, blackShort: false });
      });

      it('білий кінь бере на a8 → blackLong = false', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'N', from: 'b6', to: 'a8' })
        ).toEqual({ ...ALL_RIGHTS, blackLong: false });
      });

      it('тура бере туру на стартовій клітинці (a1→a8) → обидва довгі права', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'R', from: 'a1', to: 'a8' })
        ).toEqual({ ...ALL_RIGHTS, whiteLong: false, blackLong: false });
      });
    });

    describe('інші ходи → права не змінюються', () => {
      it('хід пішака', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'P', from: 'e2', to: 'e4' })
        ).toEqual(ALL_RIGHTS);
      });

      it('не тура йде з кутової клітинки (ферзь з a1)', () => {
        expect(
          nextCastlingRights(ALL_RIGHTS, { piece: 'Q', from: 'a1', to: 'a5' })
        ).toEqual(ALL_RIGHTS);
      });

      it('вже втрачені права не відновлюються', () => {
        const none = {
          whiteShort: false,
          whiteLong: false,
          blackShort: false,
          blackLong: false,
        };
        expect(
          nextCastlingRights(none, { piece: 'N', from: 'g1', to: 'f3' })
        ).toEqual(none);
      });
    });

    it('не мутує вхідний обʼєкт і повертає новий', () => {
      const current = { ...ALL_RIGHTS };
      const result = nextCastlingRights(current, {
        piece: 'K',
        from: 'e1',
        to: 'g1',
      });
      expect(current).toEqual(ALL_RIGHTS);
      expect(result).not.toBe(current);
    });
  });

  describe('applyMove', () => {
    describe('звичайний хід', () => {
      it('переносить фігуру з from на to', () => {
        const position = makePosition({ e1: 'K', e2: 'P', e8: 'k' });

        const result = applyMove(position, {
          piece: 'P',
          from: 'e2',
          to: 'e3',
        });

        expect(result.position.board).toEqual({ e1: 'K', e3: 'P', e8: 'k' });
      });

      it('details без взяття, рокіровки, en passant і промоції', () => {
        const position = makePosition({ e1: 'K', g1: 'N', e8: 'k' });

        const result = applyMove(position, {
          piece: 'N',
          from: 'g1',
          to: 'f3',
        });

        expect(result.details).toEqual({
          captured: null,
          castling: null,
          enPassant: false,
          promotion: null,
        });
      });

      it('не мутує вхідну позицію', () => {
        const position = makePosition({ e1: 'K', e2: 'P', e8: 'k' });

        const result = applyMove(position, {
          piece: 'P',
          from: 'e2',
          to: 'e4',
        });

        expect(position.board).toEqual({ e1: 'K', e2: 'P', e8: 'k' });
        expect(position.castlingRights).toEqual(ALL_RIGHTS);
        expect(position.enPassantTarget).toBeNull();
        expect(result.position.board).not.toBe(position.board);
      });
    });

    describe('взяття', () => {
      it('забирає фігуру суперника і повертає її в details.captured', () => {
        const position = makePosition({ e1: 'K', d4: 'N', e5: 'p', e8: 'k' });

        const result = applyMove(position, {
          piece: 'N',
          from: 'd4',
          to: 'e5',
        });

        expect(result.position.board).toEqual({ e1: 'K', e5: 'N', e8: 'k' });
        expect(result.details.captured).toBe('p');
      });
    });

    describe('en passant', () => {
      it('білий пішак бере en passant → чорний пішак зникає з d5', () => {
        const position = makePosition(
          { e1: 'K', e5: 'P', d5: 'p', e8: 'k' },
          { enPassantTarget: 'd6' }
        );

        const result = applyMove(position, {
          piece: 'P',
          from: 'e5',
          to: 'd6',
        });

        expect(result.position.board).toEqual({ e1: 'K', d6: 'P', e8: 'k' });
        expect(result.details.captured).toBe('p');
        expect(result.details.enPassant).toBe(true);
      });

      it('чорний пішак бере en passant → білий пішак зникає з e4', () => {
        const position = makePosition(
          { e1: 'K', e4: 'P', d4: 'p', e8: 'k' },
          { enPassantTarget: 'e3' }
        );

        const result = applyMove(position, {
          piece: 'p',
          from: 'd4',
          to: 'e3',
        });

        expect(result.position.board).toEqual({ e1: 'K', e3: 'p', e8: 'k' });
        expect(result.details.captured).toBe('P');
        expect(result.details.enPassant).toBe(true);
      });

      it('не пішак іде на клітинку en passant → це не взяття en passant', () => {
        const position = makePosition(
          { e1: 'K', c4: 'B', d5: 'p', e8: 'k' },
          { enPassantTarget: 'd6' }
        );

        const result = applyMove(position, {
          piece: 'B',
          from: 'c4',
          to: 'd6',
        });

        expect(result.position.board).toEqual({
          e1: 'K',
          d5: 'p',
          d6: 'B',
          e8: 'k',
        });
        expect(result.details.enPassant).toBe(false);
        expect(result.details.captured).toBeNull();
      });
    });

    describe('enPassantTarget у новій позиції', () => {
      it('пішак на 2 клітинки → встановлюється ціль', () => {
        const position = makePosition({ e1: 'K', e2: 'P', e8: 'k' });

        const result = applyMove(position, {
          piece: 'P',
          from: 'e2',
          to: 'e4',
        });

        expect(result.position.enPassantTarget).toBe('e3');
      });

      it('будь-який інший хід → стара ціль скидається в null', () => {
        const position = makePosition(
          { e1: 'K', g1: 'N', e8: 'k', d5: 'p' },
          { enPassantTarget: 'd6' }
        );

        const result = applyMove(position, {
          piece: 'N',
          from: 'g1',
          to: 'f3',
        });

        expect(result.position.enPassantTarget).toBeNull();
      });
    });

    describe('промоція', () => {
      it('білий пішак на 8-му ряду без вибору → ферзь', () => {
        const position = makePosition({ e1: 'K', a7: 'P', h8: 'k' });

        const result = applyMove(position, {
          piece: 'P',
          from: 'a7',
          to: 'a8',
        });

        expect(result.position.board).toEqual({ e1: 'K', a8: 'Q', h8: 'k' });
        expect(result.details.promotion).toBe('Q');
      });

      it('білий пішак з вибором коня → кінь', () => {
        const position = makePosition({ e1: 'K', a7: 'P', h8: 'k' });

        const result = applyMove(position, {
          piece: 'P',
          from: 'a7',
          to: 'a8',
          promotion: 'N',
        });

        expect(result.position.board.a8).toBe('N');
        expect(result.details.promotion).toBe('N');
      });

      it('чорний пішак на 1-му ряду → фігура чорного кольору (нижній регістр)', () => {
        const position = makePosition({ h1: 'K', b2: 'p', e8: 'k' });

        const result = applyMove(position, {
          piece: 'p',
          from: 'b2',
          to: 'b1',
          promotion: 'R',
        });

        expect(result.position.board.b1).toBe('r');
        expect(result.details.promotion).toBe('R');
      });

      it('промоція зі взяттям → captured і promotion одночасно', () => {
        const position = makePosition({ e1: 'K', a7: 'P', b8: 'n', h8: 'k' });

        const result = applyMove(position, {
          piece: 'P',
          from: 'a7',
          to: 'b8',
        });

        expect(result.position.board).toEqual({ e1: 'K', b8: 'Q', h8: 'k' });
        expect(result.details.captured).toBe('n');
        expect(result.details.promotion).toBe('Q');
      });
    });

    describe('рокіровка', () => {
      it('коротка рокіровка білих → король g1, тура f1', () => {
        const position = makePosition({ e1: 'K', h1: 'R', e8: 'k' });

        const result = applyMove(position, {
          piece: 'K',
          from: 'e1',
          to: 'g1',
        });

        expect(result.position.board).toEqual({ g1: 'K', f1: 'R', e8: 'k' });
        expect(result.details.castling).toBe('K');
      });

      it('довга рокіровка білих → король c1, тура d1', () => {
        const position = makePosition({ e1: 'K', a1: 'R', e8: 'k' });

        const result = applyMove(position, {
          piece: 'K',
          from: 'e1',
          to: 'c1',
        });

        expect(result.position.board).toEqual({ c1: 'K', d1: 'R', e8: 'k' });
        expect(result.details.castling).toBe('Q');
      });

      it('коротка рокіровка чорних → король g8, тура f8', () => {
        const position = makePosition({ e1: 'K', e8: 'k', h8: 'r' });

        const result = applyMove(position, {
          piece: 'k',
          from: 'e8',
          to: 'g8',
        });

        expect(result.position.board).toEqual({ e1: 'K', g8: 'k', f8: 'r' });
        expect(result.details.castling).toBe('K');
      });

      it('довга рокіровка чорних → король c8, тура d8', () => {
        const position = makePosition({ e1: 'K', e8: 'k', a8: 'r' });

        const result = applyMove(position, {
          piece: 'k',
          from: 'e8',
          to: 'c8',
        });

        expect(result.position.board).toEqual({ e1: 'K', c8: 'k', d8: 'r' });
        expect(result.details.castling).toBe('Q');
      });

      it('після рокіровки білі втрачають обидва права, чорні — ні', () => {
        const position = makePosition({ e1: 'K', h1: 'R', e8: 'k' });

        const result = applyMove(position, {
          piece: 'K',
          from: 'e1',
          to: 'g1',
        });

        expect(result.position.castlingRights).toEqual({
          ...ALL_RIGHTS,
          whiteShort: false,
          whiteLong: false,
        });
      });
    });

    describe('права рокіровки в новій позиції', () => {
      it('хід тури з h1 → whiteShort = false', () => {
        const position = makePosition({ e1: 'K', h1: 'R', e8: 'k' });

        const result = applyMove(position, {
          piece: 'R',
          from: 'h1',
          to: 'h4',
        });

        expect(result.position.castlingRights).toEqual({
          ...ALL_RIGHTS,
          whiteShort: false,
        });
      });

      it('взяття тури на a8 → blackLong = false', () => {
        const position = makePosition({ e1: 'K', g2: 'B', e8: 'k', a8: 'r' });

        const result = applyMove(position, {
          piece: 'B',
          from: 'g2',
          to: 'a8',
        });

        expect(result.position.castlingRights).toEqual({
          ...ALL_RIGHTS,
          blackLong: false,
        });
        expect(result.details.captured).toBe('r');
      });
    });
  });
});
