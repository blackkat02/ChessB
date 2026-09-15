import { moveExecuted } from './gameSlice';
import * as selectors from './gameSelectors';
import { getPieceColor } from '../../utils/chessHelpers';
import { updateTime } from './gameSlice';
import { COLORS } from './gameConstants';

export const attemptMove = (moveData) => (dispatch, getState) => {
  const { from, to, piece, time } = moveData;
  const state = getState();
  const { isGameOver } = state.game;
  const turn = selectors.selectCurrentTurn(state);

  if (isGameOver) {
    console.log('[ANALYSIS] Вільний хід без правил.');
    dispatch(moveExecuted({ ...moveData, analysis: true }));
    return;
  }

  const currentPlayerTime =
    turn === COLORS.WHITE ? state.game.whiteTime : state.game.blackTime;

  if (currentPlayerTime <= 0) {
    dispatch(handleTimeout(turn));
    return;
  }

  console.log(`[OP] Спроба ходу: ${piece} з ${from} на ${to}`);
  console.log(`[OP] Зараз хід: ${turn === COLORS.WHITE ? 'БІЛИХ' : 'ЧОРНИХ'}`);

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

  if (isFriendlyFire) {
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
    turn === COLORS.WHITE
      ? selectors.selectWhiteTime(state)
      : selectors.selectBlackTime(state);

  if (currentTime <= 0) {
    dispatch(
      setGameOver({
        winner: turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE,
        reason: 'timeout',
      })
    );
    return;
  }

  // Віднімаємо 1 секунду (1000 мс)
  dispatch(updateTime({ color: turn, time: currentTime - 1000 }));
};
