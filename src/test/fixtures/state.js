import { ALL_CASTLING } from './castling';

/**
 * @param {any} board
 */
export function makeGameState(board, overrides = {}) {
  return {
    board,
    castlingRights: { ...ALL_CASTLING },
    enPassantTarget: null,
    ...overrides,
  };
}
