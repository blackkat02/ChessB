import { moveExecuted, endGame } from './gameEvents';
import * as gameSelectors from './gameSelectors';
import { selectPlayerSide } from '../ui/uiSelectors';
import * as positionSelectors from '../position/positionSelectors';
import { COLORS } from './gameConstants';
import {
  isMoveLegal,
  applyMove,
  getStatus,
  toSan,
  getPieceColor,
  getOpponentColor,
  requiresPromotion,
  isValidPromotionPiece,
} from '../../engine';

// Усе, що редюсер раніше рахував сам, тепер рахує thunk через фасад рушія:
// нова позиція, details, статус суперника, SAN і мить ходу. Редюсер лише
// записує готовий payload (docs/layer-separation-step3.md, 3.5).
//
// status повертається окремо від payload: isStalemate потрібен лише thunk-у
// (вирішити, чи диспатчити endGame), а в action має бути тільки те, що
// записується в стан.
function buildMovePayload(position, moveData, extra = {}) {
  const { from, to, piece, promotion } = moveData;
  const move = { from, to, piece, promotion };
  // Колір — з фігури, не з черги: в режимі аналізу черга не перевіряється.
  const color = getPieceColor(piece);

  const { position: after, details } = applyMove(position, move);
  const status = getStatus(after, getOpponentColor(color));
  // Позиція ДО ходу — для дизамбігуації SAN (Nbd2 vs Nd2).
  const san = toSan(position, { ...move, ...details }, status);

  const payload = {
    move,
    color,
    position: after,
    details,
    isCheck: status.isCheck,
    isCheckmate: status.isCheckmate,
    san,
    timestamp: Date.now(),
    ...extra,
  };

  return { payload, status };
}

export const attemptMove = (moveData) => (dispatch, getState) => {
  const { from, to, piece } = moveData;
  const state = getState();
  const { isGameOver } = state.game;
  const turn = positionSelectors.selectCurrentTurn(state);
  // До гілки аналізу: buildMovePayload потрібна позиція і там.
  const position = positionSelectors.selectPosition(state);

  if (isGameOver) {
    console.log('[ANALYSIS] Вільний хід без правил.');
    const { payload } = buildMovePayload(position, moveData, {
      analysis: true,
    });
    dispatch(moveExecuted(payload));
    return;
  }

  const currentPlayerTime =
    turn === COLORS.WHITE ? state.game.whiteTime : state.game.blackTime;

  if (currentPlayerTime <= 0) {
    dispatch(timeExpired(turn));
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

  // 4. ПЕРЕВІРКА №3: легальність ходу (docs/layer-separation-step3.md, 3.1).
  // Один виклик фасаду замість трьох окремих перевірок: своя фігура на
  // цілі, геометрія, безпека короля (рокіровка — зі своєю перевіркою).
  if (!isMoveLegal(position, from, to)) {
    console.warn('🚨 Нелегальний хід.');
    return;
  }

  // 6.5. ПЕРЕВІРКА №6: якщо це промоція і гравець ЯВНО вказав фігуру —
  // вона має бути однією з Q/R/B/N (крок 6, docs/move-validation.md).
  // Якщо `promotion` не вказано — це не помилка, applyMove сам підставить
  // дефолт (ферзь).
  if (requiresPromotion(piece, to) && moveData.promotion !== undefined) {
    if (!isValidPromotionPiece(moveData.promotion)) {
      console.warn('🚨 Недійсна фігура для промоції.');
      return;
    }
  }

  // 7. Хід валідний: рахуємо все одразу й диспатчимо одну подію.
  console.log('✅ Хід валідний! Диспатчимо оновлення.');
  const { payload, status } = buildMovePayload(position, moveData);
  dispatch(moveExecuted(payload));

  // 8. Мат/пат НАСТУПНОГО гравця. Статус уже порахований для позиції після
  // ходу, тож перечитувати стан через getState() не треба.
  if (status.isCheckmate) {
    dispatch(endGame({ winner: turn, reason: 'checkmate' }));
  } else if (status.isStalemate) {
    dispatch(endGame({ winner: 'draw', reason: 'stalemate' }));
  }
};

// Диспатчиться з useGameState.js, коли selectClockRemaining показує 0 для
// активної сторони (docs/clock-and-game-record.md, розділ 7.2) — Clock.jsx
// сам по собі суто презентаційний і нічого не диспатчить (розділ 7.3).
// Раніше тут була окрема `tickTimer`, що писала відлік секунда-за-секундою
// назад у Redux через неіснуючий `setGameOver`, ніким не викликана й ніколи
// не працювала.
export const timeExpired = (color) => (dispatch, getState) => {
  const state = getState();
  if (state.game.isGameOver) return; // партія вже могла завершитись матом/патом раніше

  // Захист від гонки (docs/clock-and-game-record.md, розділ 6, рядок
  // "таймаут прийшов двічі"): перевіряємо ЩЕ РАЗ, живим селектором, а не
  // довіряємо самому факту виклику — викликач міг спиратись на застарілий
  // замикання значення `remaining` (наприклад, ефект у useGameState.js
  // порахував 0 на попередньому рендері, диспатч дійшов сюди із затримкою,
  // а за цей час партія вже завершилась матом, або (гіпотетично) сюди
  // прийшло ще одне повідомлення про той самий таймаут).
  if (gameSelectors.selectClockRemaining(state, color) > 0) return;

  dispatch(
    endGame({
      winner: getOpponentColor(color),
      reason: 'timeout',
      timedOutColor: color,
    })
  );
};

// Здається завжди гравець за цим пристроєм (`playerSide`), незалежно від
// того, чия зараз черга ходити — здача не пов'язана з чергою ходу.
export const resignGame = () => (dispatch, getState) => {
  const state = getState();
  if (state.game.isGameOver) return;

  dispatch(
    endGame({
      winner: getOpponentColor(selectPlayerSide(state)),
      reason: 'resignation',
    })
  );
};

// Пропозиція нічиєї: обидва гравці за одним пристроєм, тому "прийняття"
// підтверджується локально в UI (window.confirm) ще до диспатчу цього thunk.
export const offerDraw = () => (dispatch, getState) => {
  const { isGameOver } = getState().game;
  if (isGameOver) return;

  dispatch(endGame({ winner: 'draw', reason: 'draw-agreement' }));
};
