// src/utils/chessHelpers.js
import { COLORS } from '../redux/game/gameConstants';

export const getPieceColor = (fenSymbol) => {
  if (!fenSymbol) return null;
  return fenSymbol === fenSymbol.toUpperCase() ? COLORS.WHITE : COLORS.BLACK;
};

export const getOpponentColor = (color) =>
  color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
