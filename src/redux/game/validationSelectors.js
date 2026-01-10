// Перевірка: чи порожня клітинка?
export const selectIsSquareEmpty = (state, squareId) =>
  !state.game.board[squareId];
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

import { getPieceColor } from '../../utils/chessHelpers';

// Дістати колір фігури на певній клітинці
export const selectPieceColorAt = (state, squareId) => {
  const piece = state.game.board[squareId];
  return piece ? getPieceColor(piece) : null;
};

// Чи належить фігура на клітинці поточному гравцю?
export const selectIsOwnPiece = (state, squareId) => {
  const pieceColor = selectPieceColorAt(state, squareId);
  const currentTurn = selectTurn(state);
  return pieceColor === currentTurn;
};

// Перевірка: чи не б'ємо ми свого?
export const selectIsFriendlyFire = (state, toSquareId) => {
  const movingPieceColor = selectPieceColorAt(
    state,
    selectSelectedSquare(state)
  );
  const targetPieceColor = selectPieceColorAt(state, toSquareId);
  return targetPieceColor !== null && movingPieceColor === targetPieceColor;
};

export const selectIsMovePossible = (state, from, to) => {
  if (selectIsSquareEmpty(state, from)) return false;

  if (from === to) return false;

  if (!selectIsOwnPiece(state, from)) return false;

  if (selectIsFriendlyFire(state, to)) return false;

  return true;
};
