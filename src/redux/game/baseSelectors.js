import { attemptMove } from './gameOperations';

export const selectBoard = (state) => state.game.board;
export const selectCurrentTurn = (state) => state.game.turn;
export const selectSelectedSquare = (state) => state.game.selectedSquare;

export const selectWhiteTime = (state) => state.game.whiteTime;
export const selectBlackTime = (state) => state.game.blackTime;

// Розумні (рахують логіку на основі базових)
export const selectIsWhiteTurn = (state) => state.game.turn === 'w';

// Чи активний годинник конкретного кольору?
export const selectIsClockActive = (state, color) => state.game.turn === color;

// Отримати фігуру на конкретній клітинці (дуже важливо для бота!)
export const selectPieceAtSquare = (state, squareId) =>
  state.game.board[squareId];
