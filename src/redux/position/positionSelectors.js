import { getPieceColor } from '../../engine';
import { COLORS } from '../game/gameConstants';

// Селектори позиції — входу для рушія (docs/layer-separation-step4.md, 4.4).
// Читають лише state.position; запис партії — у ../game/gameSelectors.js.

// Позиція для рушія одним об'єктом. Без createSelector: state.position уже
// є тим самим об'єктом, поки позиція не змінилась (moveExecuted замінює його
// цілком), тож мемоізувати нічого.
export const selectPosition = (state) => state.position;

export const selectBoard = (state) => state.position.board;

export const selectCurrentTurn = (state) => state.position.turn;
export const selectIsWhiteTurn = (state) =>
  selectCurrentTurn(state) === COLORS.WHITE;

export const selectPieceAtSquare = (state, squareId) =>
  selectBoard(state)[squareId];

export const selectIsSquareEmpty = (state, squareId) =>
  !selectBoard(state)[squareId];

export const selectPieceColorAt = (state, squareId) => {
  const piece = selectBoard(state)[squareId];
  return piece ? getPieceColor(piece) : null;
};

// Чи належить фігура на клітинці стороні, чия черга ходу?
export const selectIsOwnPiece = (state, squareId) => {
  const pieceColor = selectPieceColorAt(state, squareId);
  const currentTurn = selectCurrentTurn(state);
  return pieceColor === currentTurn;
};
