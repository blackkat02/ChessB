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
export const selectMoveHistory = (state) => state.game.history;

// Групування history в пари { number, white, black } для рендеру
// "1. e4 e5 2. Nf3 Nc6" (docs/move-notation.md, розділ 7). `black` лишається
// `null` для непарної кількості напівходів (білі щойно зробили останній хід).
// Колір визначаємо з `piece` (FEN-регістр) — наш `history` не зберігає
// окреме поле `color`, на відміну від моделі ходу в тому документі.
export const selectMovePairs = (state) =>
  state.game.history.reduce((pairs, move) => {
    if (getPieceColor(move.piece) === COLORS.WHITE) {
      pairs.push({ number: pairs.length + 1, white: move, black: null });
    } else if (pairs.length > 0) {
      // pairs.length === 0 тут означало б, що партія почалась ходом чорних —
      // неможливо у звичайній грі, але захищаємось від "аналізу без правил"
      // (gameOperations.js: isGameOver -> вільні ходи без перевірки черги).
      pairs[pairs.length - 1].black = move;
    }
    return pairs;
  }, []);

// === 2. СЕЛЕКТОРИ СТАНУ (Game Status) ===
// turn — похідне значення, не окреме поле стану: парний plyCount = хід білих.
export const selectCurrentTurn = (state) =>
  state.game.plyCount % 2 === 0 ? COLORS.WHITE : COLORS.BLACK;
export const selectIsWhiteTurn = (state) => selectCurrentTurn(state) === COLORS.WHITE;
export const selectIsClockActive = (state, color) => selectCurrentTurn(state) === color;
export const selectHasGameStarted = (state) => state.game.plyCount > 0;
export const selectIsGameOver = (state) => state.game.isGameOver;
export const selectWinner = (state) => state.game.winner;
export const selectReason = (state) => state.game.reason;

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
