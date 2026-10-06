import { applyMove } from './applyMove';
import { isCheck, isCheckmate } from './gameStatus';
import { getPieceColor, getOpponentColor } from './chessHelpers';

export { applyMove };

/**
 * Повертає деталі ходу (captured, castling, enPassant, promotion, isCheck,
 * isCheckmate) і но -ву позицію для вже перевіреного легального ходу.
 *
 * @param {{ board: { [x: string]: any; }, castlingRights: any, enPassantTarget: any }} gameState
 * @param {string} from
 * @param {string} to
 * @param {{ promotion?: string }} [options]
 */
export function getMoveDetails(gameState, from, to, options = {}) {
  const piece = gameState.board[from];
  if (!piece) throw new Error(`getMoveDetails: на ${from} немає фігури`);

  const { position, details } = applyMove(gameState, {
    from,
    to,
    piece,
    promotion: options.promotion,
  });

  // Шах/мат перевіряємо для СУПЕРНИКА в позиції ПІСЛЯ ходу
  const opponent = getOpponentColor(getPieceColor(piece));
  const givesCheckmate = isCheckmate(position, opponent);
  const givesCheck = givesCheckmate || isCheck(position.board, opponent);

  return {
    ...details,
    castlingRights: position.castlingRights,
    enPassantTarget: position.enPassantTarget,
    isCheck: givesCheck,
    isCheckmate: givesCheckmate,
    position,
  };
}

// src/engine/index.js
// Публічний фасад шахового двигуна. Див. docs/move-validation.md, розділ 4.2.
//
// gameOperations.js (attemptMove) має імпортувати рушій лише звідси,
// не з внутрішніх модулів напряму.

/**
 * Чи є хід from -> to легальним у поточному стані гри.
 *
 * @param {object} gameState - зріз state.game
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
// eslint-disable-next-line no-unused-vars
export function isMoveLegal(gameState, from, to) {
  throw new Error(
    'isMoveLegal: не реалізовано (docs/move-validation.md, крок 1+)'
  );
}

/**
 * Легальні ходи для фігури на клітинці `from` (для підсвітки в UI).
 *
 * @param {object} gameState
 * @param {string} from
 * @returns {string[]}
 */
// eslint-disable-next-line no-unused-vars
export function getLegalMoves(gameState, from) {
  throw new Error(
    'getLegalMoves: не реалізовано (docs/move-validation.md, крок 1+)'
  );
}
