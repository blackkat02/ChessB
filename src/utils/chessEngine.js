export const validateMoveWithChessJS = (fen, from, to) => {
  if (selectIsSquareEmpty(state, from)) return false;

  if (from === to) return false;

  if (!selectIsOwnPiece(state, from)) return false;

  if (selectIsFriendlyFire(state, to)) return false;

  return true;
};
