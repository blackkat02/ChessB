import { COLORS } from './constants';

export const getPieceColor = (fenSymbol) => {
  if (!fenSymbol) return null;
  return fenSymbol === fenSymbol.toUpperCase() ? COLORS.WHITE : COLORS.BLACK;
};

// Тип фігури без кольору: 'p' і 'P' → 'P'. Порожня клітинка → null.
export const getPieceType = (fenSymbol) => {
  if (!fenSymbol) return null;
  return fenSymbol.toUpperCase();
};

export const getOpponentColor = (color) =>
  color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
