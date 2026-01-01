import { moveExecuted, validationStarted } from './gameSlice';
import { selectCurrentTurn } from './gameSelectors';
import { getPieceColor } from '../../utils/chessHelpers'; // Твоя функція кольору

export const attemptMove = (moveData) => (dispatch, getState) => {
  const { piece, from, to } = moveData;
  const state = getState();
  const currentTurn = selectCurrentTurn(state);

  dispatch(validationStarted());

  // ВАЛІДАЦІЯ №1: Чи своя зараз черга?
  if (getPieceColor(piece) !== currentTurn) {
    console.error(
      `🛑 [VALIDATION] Спроба ходу не своєю фігурою! Зараз хід: ${currentTurn}`
    );
    return; // Хід ігнорується, стан не змінюється
  }

  // ВАЛІДАЦІЯ №2: Чи не клікнули ми в ту саму клітинку?
  if (from === to) return;

  // Якщо всі заглушки пройдені — виконуємо
  dispatch(moveExecuted(moveData));
};
