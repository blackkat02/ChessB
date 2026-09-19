import { moveExecuted, endGame } from './gameSlice';
import * as selectors from './gameSelectors';
import { getPieceColor, getOpponentColor } from '../../utils/chessHelpers';
import { COLORS } from './gameConstants';
import { getPseudoLegalMoves } from '../../engine/pseudoMoves';
import { filterByKingSafety, getCastlingMoves } from '../../engine/legalMoves';
import { isCheckmate, isStalemate } from '../../engine/gameStatus';
import { requiresPromotion, isValidPromotionPiece } from '../../engine/promotion';

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

  // 4. ПЕРЕВІРКА №3: Чи пуста клітина to та не своєго кольору?
  const isFriendlyFire = selectors.selectIsFriendlyFire(state, to);

  if (isFriendlyFire) {
    console.warn('[OP] Спроба удару своєї фігури, ігноруємо.');
    return;
  }

  // 5. ПЕРЕВІРКА №4: чи хід відповідає геометрії фігури (крок 1, docs/move-validation.md).
  // Це псевдолегальність — без урахування, чи хід залишає власного короля
  // під шахом (це кроки 3+). Знімає головний баг: без цієї перевірки будь-яка
  // фігура могла "ходити" на будь-яку не свою клітинку дошки.
  const { board, enPassantTarget, castlingRights } = state.game;
  const pseudoLegalMoves = getPseudoLegalMoves(board, from, enPassantTarget);

  // Рокіровка — окремий вид ходу, не "геометрія" (король ходить на 2
  // клітинки лише в цьому випадку). Рахуємо її окремо й додаємо до
  // кандидатів лише для короля (крок 4, docs/move-validation.md, розділ 3.4).
  const castlingMoves =
    getPieceColor(piece) === turn && piece.toUpperCase() === 'K'
      ? getCastlingMoves(board, turn, castlingRights)
      : [];

  if (![...pseudoLegalMoves, ...castlingMoves].includes(to)) {
    console.warn('🚨 Хід не відповідає геометрії фігури.');
    return;
  }

  // 6. ПЕРЕВІРКА №5: чи хід не залишає власного короля під шахом (крок 3,
  // docs/move-validation.md). Рокіровку сюди НЕ пускаємо — getCastlingMoves
  // уже перевірив і шах, і прохід короля через атаковані клітинки власною,
  // ширшою логікою (filterByKingSafety симулює рух лише ОДНІЄЇ фігури, а
  // рокіровка рухає короля й туру одночасно).
  const isCastlingMove = castlingMoves.includes(to);
  if (!isCastlingMove) {
    const legalMoves = filterByKingSafety(board, from, pseudoLegalMoves, turn, enPassantTarget);
    if (!legalMoves.includes(to)) {
      console.warn('🚨 Хід залишає власного короля під шахом.');
      return;
    }
  }

  // 6.5. ПЕРЕВІРКА №6: якщо це промоція і гравець ЯВНО вказав фігуру —
  // вона має бути однією з Q/R/B/N (крок 6, docs/move-validation.md).
  // Якщо `promotion` не вказано — це не помилка, редюсер сам підставить
  // дефолт (ферзь); UI-вибір фігури — окрема, ще не реалізована задача.
  if (requiresPromotion(piece, to) && moveData.promotion !== undefined) {
    if (!isValidPromotionPiece(moveData.promotion)) {
      console.warn('🚨 Недійсна фігура для промоції.');
      return;
    }
  }

  // 7. Якщо все ОК — даємо команду Слайсу оновити дошку
  console.log('✅ Хід валідний! Диспатчимо оновлення.');
  dispatch(moveExecuted(moveData));

  // 8. ПЕРЕВІРКА МАТУ/ПАТУ (крок 5, docs/move-validation.md) — дивимось на
  // становище НАСТУПНОГО гравця (того, чия черга щойно настала), не того,
  // хто щойно ходив. moveExecuted уже оновив board/plyCount, тому читаємо
  // стан заново через getState(), а не використовуємо застарілий `state`.
  const nextTurn = getOpponentColor(turn);
  const gameStateAfterMove = getState().game;

  if (isCheckmate(gameStateAfterMove, nextTurn)) {
    dispatch(endGame({ winner: turn, reason: 'checkmate' }));
  } else if (isStalemate(gameStateAfterMove, nextTurn)) {
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
  if (selectors.selectClockRemaining(state, color) > 0) return;

  dispatch(endGame({ winner: getOpponentColor(color), reason: 'timeout', timedOutColor: color }));
};

// Здається завжди гравець за цим пристроєм (`playerSide`), незалежно від
// того, чия зараз черга ходити — здача не пов'язана з чергою ходу.
export const resignGame = () => (dispatch, getState) => {
  const { isGameOver, playerSide } = getState().game;
  if (isGameOver) return;

  dispatch(endGame({ winner: getOpponentColor(playerSide), reason: 'resignation' }));
};

// Пропозиція нічиєї: обидва гравці за одним пристроєм, тому "прийняття"
// підтверджується локально в UI (window.confirm) ще до диспатчу цього thunk.
export const offerDraw = () => (dispatch, getState) => {
  const { isGameOver } = getState().game;
  if (isGameOver) return;

  dispatch(endGame({ winner: 'draw', reason: 'draw-agreement' }));
};
