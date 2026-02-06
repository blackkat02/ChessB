import { moveExecuted } from './gameSlice';
import * as selectors from './gameSelectors';
import { getPieceColor } from '../../utils/chessHelpers';
// import { updateTime, setGameOver } from './gameSlice';
import { updateTime } from './gameSlice';

export const attemptMove = (moveData) => (dispatch, getState) => {
  const { from, to, piece, time } = moveData;
  const state = getState();
  const { isGameOver, turn, whiteTime, blackTime } = state.game;

  if (isGameOver) {
    console.log('[ANALYSIS] Вільний хід без правил.');
    // Просто виконуємо переміщення фігури в Redux без зміни черги чи перевірок
    dispatch(moveExecuted({ ...moveData, analysis: true }));
    return;
  }

  const currentPlayerTime =
    state.game.turn === 'w' ? state.game.whiteTime : state.game.blackTime;

  if (currentPlayerTime <= 0) {
    dispatch(handleTimeout(state.game.turn));
    return; // Жодних ходів для трупів
  }

  const currentTurn = selectors.selectCurrentTurn(state);

  console.log(`[OP] Спроба ходу: ${piece} з ${from} на ${to}`);
  console.log(`[OP] Зараз хід: ${currentTurn === 'w' ? 'БІЛИХ' : 'ЧОРНИХ'}`);

  // СТАНДАРТНА ГРА (Тут твої існуючі перевірки)
  if (getPieceColor(moveData.piece) !== turn) {
    console.warn('🚨 СТОП! Хід не за чергою.');
    return;
  }

  // 3. ПЕРЕВІРКА №2: Чи не клікнули в ту саму точку?
  if (from === to) {
    console.log('[OP] Клік по тій самій клітинці, ігноруємо.');
    return;
  }

  // 4. ПЕРЕВІРКА №3: Чи пуста клітина to та не своєго кольору?
  const isFriendlyFire = selectors.selectIsFriendlyFire(state, to);

  if (selectors.isFriendlyFire) {
    console.warn('[OP] Спроба удару своєї фігури, ігноруємо.');
    return;
  }

  // 5. Якщо все ОК — даємо команду Слайсу оновити дошку
  console.log('✅ Хід валідний! Диспатчимо оновлення.');
  dispatch(moveExecuted(moveData));
};

export const tickTimer = () => (dispatch, getState) => {
  const state = getState();
  const turn = selectors.selectCurrentTurn(state);
  const currentTime =
    turn === 'w'
      ? selectors.selectWhiteTime(state)
      : selectors.selectBlackTime(state);

  if (currentTime <= 0) {
    dispatch(
      setGameOver({ winner: turn === 'w' ? 'b' : 'w', reason: 'timeout' })
    );
    return;
  }

  // Віднімаємо 1 секунду (1000 мс)
  dispatch(updateTime({ color: turn, time: currentTime - 1000 }));
};
