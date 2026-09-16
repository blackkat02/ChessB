import { getPieceColor } from '../../utils/chessHelpers';
import { COLORS } from './gameConstants';

// === 1. БАЗОВІ СЕЛЕКТОРИ (Raw Data) ===
export const selectBoard = (state) => state.game.board;
export const selectSelectedSquare = (state) => state.game.selectedSquare;
export const selectWhiteTime = (state) => state.game.whiteTime;
export const selectBlackTime = (state) => state.game.blackTime;
export const selectPlyCount = (state) => state.game.plyCount;
export const selectPlayerSide = (state) => state.game.playerSide;
export const selectGameId = (state) => state.game.gameId;

// === 2. СЕЛЕКТОРИ СТАНУ (Game Status) ===
// turn — похідне значення, не окреме поле стану: парний plyCount = хід білих.
export const selectCurrentTurn = (state) =>
  state.game.plyCount % 2 === 0 ? COLORS.WHITE : COLORS.BLACK;
export const selectIsWhiteTurn = (state) => selectCurrentTurn(state) === COLORS.WHITE;
export const selectIsClockActive = (state, color) => selectCurrentTurn(state) === color;
export const selectHasGameStarted = (state) => state.game.plyCount > 0;

// === 3. СЕЛЕКТОРИ ФІГУР (Piece Intelligence) ===
export const selectPieceAtSquare = (state, squareId) =>
  state.game.board[squareId];

export const selectIsSquareEmpty = (state, squareId) =>
  !state.game.board[squareId];

export const selectPieceColorAt = (state, squareId) => {
  const piece = state.game.board[squareId];
  return piece ? getPieceColor(piece) : null;
};

// Чи належить фігура на клітинці поточному гравцю?
export const selectIsOwnPiece = (state, squareId) => {
  const pieceColor = selectPieceColorAt(state, squareId);
  const currentTurn = selectCurrentTurn(state);
  return pieceColor === currentTurn;
};

// === 4. ВАЛІДАЦІЙНІ СЕЛЕКТОРИ (Move Validation) ===

// Перевірка: чи не б'ємо ми свого?
export const selectIsFriendlyFire = (state, toSquareId) => {
  const fromSquareId = selectSelectedSquare(state);

  console.log('selectIsFriendlyFire старт ');
  console.log('fromSquareId: ', fromSquareId);

  if (!fromSquareId) return false;

  const movingPieceColor = selectPieceColorAt(state, fromSquareId);
  const targetPieceColor = selectPieceColorAt(state, toSquareId);

  console.log('movingPieceColor: ', movingPieceColor);
  console.log('targetPieceColor: ', targetPieceColor);

  return targetPieceColor !== null && movingPieceColor === targetPieceColor;
};

// Головний валідатор для UI та Бота
export const selectIsMovePossible = (state, from, to) => {
  if (selectIsSquareEmpty(state, from)) return false;
  if (from === to) return false;
  if (!selectIsOwnPiece(state, from)) return false;
  if (selectIsFriendlyFire(state, to)) return false;

  return true;
};
