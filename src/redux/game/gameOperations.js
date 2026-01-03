import { moveExecuted } from './gameSlice';
import * as selectors from './gameSelectors';
import { getPieceColor } from '../../utils/chessHelpers';

export const attemptMove = (moveData) => (dispatch, getState) => {
  const { from, to, piece } = moveData;
  const state = getState();

  // 1. Отримуємо з Redux інформацію: чий зараз хід?
  const currentTurn = selectors.selectCurrentTurn(state);

  console.log(`[OP] Спроба ходу: ${piece} з ${from} на ${to}`);
  console.log(`[OP] Зараз хід: ${currentTurn === 'w' ? 'БІЛИХ' : 'ЧОРНИХ'}`);

  // 2. ПЕРЕВІРКА №1: Чи своєю фігурою ходимо?
  if (getPieceColor(piece) !== currentTurn) {
    console.warn('🚨 СТОП! Спроба ходу чужою фігурою. Хід ігнорується.');
    return; // Просто виходимо, нічого не робимо
  }

  // 3. ПЕРЕВІРКА №2: Чи не клікнули в ту саму точку?
  if (from === to) {
    console.log('[OP] Клік по тій самій клітинці, ігноруємо.');
    return;
  }

  // 4. ПЕРЕВІРКА №3: Чи пуста клітина to та не своєго кольору?
  if (selectIsFriendlyFire) {
    console.warn('[OP] Спроба удару своєї фігури, ігноруємо.');
    return;
  }

  // 5. Якщо все ОК — даємо команду Слайсу оновити дошку
  console.log('✅ Хід валідний! Диспатчимо оновлення.');
  dispatch(moveExecuted(moveData));
};
