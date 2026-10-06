import { algebraicToCoords, coordsToAlgebraic } from './boardUtils';
import { getPieceColor } from './chessHelpers';
import { requiresPromotion, resolvePromotionPiece } from './promotion';
import { COLORS } from './constants';

export const ROOK_HOME_SQUARE_RIGHT = {
  a1: 'whiteLong',
  h1: 'whiteShort',
  a8: 'blackLong',
  h8: 'blackShort',
};

export const CASTLING_ROOK_MOVES = {
  e1: {
    g1: { from: 'h1', to: 'f1', side: 'K' },
    c1: { from: 'a1', to: 'd1', side: 'Q' },
  },
  e8: {
    g8: { from: 'h8', to: 'f8', side: 'K' },
    c8: { from: 'a8', to: 'd8', side: 'Q' },
  },
};

/**
 * @param {{ board, castlingRights, enPassantTarget }} position
 * @param {{ from, to, piece, promotion? }} move
 * @returns {{
 *   position: { board, castlingRights, enPassantTarget }, // НОВИЙ об'єкт
 *   details:  { captured, castling, enPassant, promotion }
 * }}
 */
export function applyMove(position, move) {
  const { from, to, piece, promotion } = move;
  const board = { ...position.board };

  let captured = board[to] || null;

  const isEnPassantCapture =
    piece.toUpperCase() === 'P' && to === position.enPassantTarget && !captured;

  if (isEnPassantCapture) {
    const { row: fromRow } = algebraicToCoords(from);
    const { col: toCol } = algebraicToCoords(to);
    const capturedPawnSquare = coordsToAlgebraic(fromRow, toCol);
    captured = board[capturedPawnSquare];
    delete board[capturedPawnSquare];
  }

  const isPromotion = requiresPromotion(piece, to);
  const pieceToPlace = isPromotion
    ? resolvePromotionPiece(piece, promotion)
    : piece;

  delete board[from];
  board[to] = pieceToPlace;

  const castlingRights = nextCastlingRights(position.castlingRights, move);

  const castlingRookMove = getCastlingRookMove(piece, from, to);

  if (castlingRookMove) {
    const rook = board[castlingRookMove.from];
    delete board[castlingRookMove.from];
    board[castlingRookMove.to] = rook;
  }

  return {
    position: {
      board,
      castlingRights: castlingRights,
      enPassantTarget: nextEnPassantTarget(move),
    },
    details: {
      captured: captured,
      castling: castlingRookMove?.side ?? null,
      enPassant: isEnPassantCapture,
      promotion: isPromotion ? pieceToPlace.toUpperCase() : null,
    },
  };
}

export function nextCastlingRights(current, { from, to, piece }) {
  const rights = { ...current };

  if (piece.toUpperCase() === 'K') {
    if (getPieceColor(piece) === COLORS.WHITE) {
      rights.whiteShort = false;
      rights.whiteLong = false;
    } else {
      rights.blackShort = false;
      rights.blackLong = false;
    }
  } else if (piece.toUpperCase() === 'R' && ROOK_HOME_SQUARE_RIGHT[from]) {
    // Важливо перевіряти саме тип фігури: клітинка a1/h1/a8/h8 могла вже
    // давно приймати іншу фігуру (наприклад, ферзя), і її від'їзд звідти
    // не повинен відбирати право рокіровки, яке стосується самої тури.
    rights[ROOK_HOME_SQUARE_RIGHT[from]] = false;
  }

  // А ось клітинку `to` перевіряємо завжди, незалежно від того, хто туди
  // прийшов, — це представляє "туру з'їли на її стартовій клітинці".
  if (ROOK_HOME_SQUARE_RIGHT[to]) rights[ROOK_HOME_SQUARE_RIGHT[to]] = false;

  return rights;
}

// enPassantTarget живе рівно один напівхід: встановлюється тільки одразу
// після ходу пішака на 2 клітинки, інакше завжди скидається в null.
export function nextEnPassantTarget({ piece, from, to }) {
  if (piece.toUpperCase() !== 'P') return null;

  const { row: fromRow, col: fromCol } = algebraicToCoords(from);
  const { row: toRow } = algebraicToCoords(to);
  if (Math.abs(toRow - fromRow) !== 2) return null;

  const middleRow = (fromRow + toRow) / 2;
  return coordsToAlgebraic(middleRow, fromCol);
}

/**
 * @param {string} piece
 * @param {string | number} from
 * @param {string | number} to
 */
export function getCastlingRookMove(piece, from, to) {
  if (piece.toUpperCase() !== 'K') return null;
  return CASTLING_ROOK_MOVES[from]?.[to] ?? null;
}
