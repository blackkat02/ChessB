import { ALL_CASTLING, NO_CASTLING } from './castling';

/**
 * @param {any} board
 */
export function makeGameState(board, overrides = {}) {
  return {
    board,
    castlingRights: { ...ALL_CASTLING },
    enPassantTarget: null,
    turn: 'w',
    ...overrides,
  };
}

export function makeMovePayload(overrides = {}) {
  return {
    move: { from: 'e2', to: 'e4', piece: 'P' },
    color: 'w',
    position: {
      board: { e4: 'P' },
      castlingRights: { ...NO_CASTLING },
      enPassantTarget: 'e3',
      turn: 'b',
    },
    details: {
      captured: null,
      castling: null,
      enPassant: false,
      promotion: null,
    },
    isCheck: false,
    isCheckmate: false,
    san: 'e4',
    timestamp: 1_000_000,
    ...overrides,
  };
}
