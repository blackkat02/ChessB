// src/engine/gameStatus.js
// Шах / мат / пат — усі три через один і той самий getAllLegalMoves.
// Див. docs/archive/move-validation.md, розділ 3.5 та розділ 5 (крок 5).

import { getPieceColor, getOpponentColor, getPieceType } from './chessHelpers';
import { findKingSquare, getLegalMoves } from './legalMoves';
import { isSquareAttacked } from './attacks';

/**
 * @param {Record<string, string>} board
 * @param {'w'|'b'} color
 * @returns {boolean}
 */
export function isCheck(board, color) {
  const kingSquare = findKingSquare(board, color);
  if (!kingSquare) return false; // дошка без короля (тестові фікстури) — шаху немає

  return isSquareAttacked(board, kingSquare, getOpponentColor(color));
}

/**
 * Усі легальні ходи всіх фігур кольору `color` у поточній позиції гри.
 * Для кожної фігури — getLegalMoves (геометрія + безпека короля +
 * рокіровка), тож правила легальності живуть в одному місці.
 *
 * @param {{ board, castlingRights, enPassantTarget }} gameState
 * @param {'w'|'b'} color
 * @returns {Array<{ from: string, to: string }>}
 */
export function getAllLegalMoves(gameState, color) {
  const moves = [];

  for (const [square, piece] of Object.entries(gameState.board)) {
    if (getPieceColor(piece) !== color) continue;

    getLegalMoves(gameState, square).forEach((to) =>
      moves.push({ from: square, to })
    );
  }

  return moves;
}

/**
 * Статус сторони `color` у позиції. Легальні ходи рахуються ОДИН раз.
 * Мат завжди має і isCheck: true; мат і пат взаємовиключні.
 *
 * @param {{ board, castlingRights, enPassantTarget }} position
 * @param {'w'|'b'} color
 * @returns {{ isCheck: boolean, isCheckmate: boolean, isStalemate: boolean, isInsufficientMaterial: boolean }}
 */
export function getStatus(position, color) {
  const inCheck = isCheck(position.board, color);
  const hasMoves = getAllLegalMoves(position, color).length > 0;
  const insufficientMaterial = isInsufficientMaterial(position.board);

  return {
    isCheck: inCheck,
    isCheckmate: inCheck && !hasMoves,
    isStalemate: !inCheck && !hasMoves,
    isInsufficientMaterial: insufficientMaterial,
  };
}

/**
 * @param {object} gameState
 * @param {'w'|'b'} color
 * @returns {boolean}
 */
export function isCheckmate(gameState, color) {
  return getStatus(gameState, color).isCheckmate;
}

/**
 * @param {object} gameState
 * @param {'w'|'b'} color
 * @returns {boolean}
 */
export function isStalemate(gameState, color) {
  return getStatus(gameState, color).isStalemate;
}

/**
 * Фігури без королів: { e1: 'K', c3: 'N', e8: 'k' } → ['N']
 * @param {Record<string, string>} board
 * @returns {string[]}
 */
export function getNonKingPieces(board) {
  return Object.values(board).filter((piece) => getPieceType(piece) !== 'K');
}

/**
 * Пари без королів: { e1: 'K', c1: 'B', e8: 'k' } → [['c1', 'B']]
 */
export function getNonKingEntries(board) {
  return Object.entries(board).filter(
    ([, piece]) => getPieceType(piece) !== 'K'
  );
}

export function isInsufficientMaterial(board) {
  const nonKingPiecesLength = getNonKingPieces(board).length;
  const nonKingPiece = getPieceType(getNonKingPieces(board)[0]);

  if (nonKingPiecesLength === 0) {
    return true;
  } else if (
    nonKingPiecesLength === 1 &&
    (nonKingPiece === 'B' || nonKingPiece === 'N')
  ) {
    return true;
  }

  const entries = getNonKingEntries(board);

  if (entries.every(([, piece]) => getPieceType(piece) === 'B')) {
    const squareColor = getSquareColor(entries[0][0]);

    if (entries.every(([square]) => getSquareColor(square) === squareColor)) {
      return true;
    }
  }

  return false;
}

// 'a1' → 'dark', 'h1' → 'light'
export function getSquareColor(square) {
  const [file, rank] = square;
  const sum = 'abcdefgh'.indexOf(file) + Number(rank);

  return sum % 2 === 0 ? 'light' : 'dark';
}
