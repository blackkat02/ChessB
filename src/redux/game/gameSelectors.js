export const selectBoard = (state) => state.game.board;
export const selectCurrentTurn = (state) => state.game.turn;
export const selectSelectedSquare = (state) => state.game.selectedSquare;
export const selectWhiteTime = (state) => state.game.whiteTime;
export const selectBlackTime = (state) => state.game.blackTime;
export const selectIsWhiteTurn = (state) => state.game.turn === 'w';
export const selectIsActiveColor = (state, color) => state.game.turn === color;
export const selectBoardPiecesObject = (state) => state.game.board;

// Селектор для перевірки валідності (заглушка)
export const selectCanMakeMove = (state, from, to) => {
  const board = selectBoard(state);
  const turn = selectCurrentTurn(state);

  const piece = board[from];
  const targetPiece = board[to];

  // Проста логіка заглушки:
  // 1. На клітинці 'from' має бути фігура
  // 2. Колір фігури має збігатися з поточною чергою (використовуємо твою функцію getPieceColor)
  // 3. Ми не можемо бити власну фігуру (targetPiece колір != piece колір)

  if (!piece) return false;

  // Тут ми пізніше додамо getPieceColor(piece) === turn
  // Поки що повертаємо true, щоб хід просто працював
  return true;
};
