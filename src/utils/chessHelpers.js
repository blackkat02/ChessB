// src/utils/chessHelpers.js
export const getPieceColor = (fenSymbol) => {
  if (!fenSymbol) return null;
  return fenSymbol === fenSymbol.toUpperCase() ? 'w' : 'b';
};
