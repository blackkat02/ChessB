import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
import { algebraicToCoords, coordsToAlgebraic } from '../../utils/boardUtils';
import { getPieceColor, getOpponentColor } from '../../utils/chessHelpers';
import { requiresPromotion, resolvePromotionPiece } from '../../engine/promotion';
import { isCheck, isCheckmate } from '../../engine/gameStatus';
import { buildSan } from '../../engine/notation';
import { DEFAULT_TIME, COLORS } from './gameConstants';

const initialState = {
  board: initialBoardPiecesObject, // Об'єкт { a2: 'P', ... }
  selectedSquare: null, // 'e2' або null
  whiteTime: DEFAULT_TIME,
  blackTime: DEFAULT_TIME,
  history: [],
  plyCount: 0, // кількість зроблених напівходів (ходи = plyCount пар для запису партії)
  winner: null, // COLORS.WHITE, COLORS.BLACK, або 'draw'
  reason: null, // 'checkmate', 'timeout', 'resignation'
  isGameOver: false,
  playerSide: COLORS.WHITE, // якою стороною грає гравець за цим пристроєм (впливає лише на орієнтацію дошки)
  gameId: 0, // зростає з кожною новою партією; UI використовує це як React key, щоб примусово перемонтувати годинники
  castlingRights: { wK: true, wQ: true, bK: true, bQ: true }, // docs/move-validation.md, крок 4
  enPassantTarget: null, // клітинка, легальна для взяття на проході рівно один напівхід
};

// Клітинка тури -> яке право рокіровки вона стосується. Хід ЗІ цієї клітинки
// (тура пішла) або ходу НА цю клітинку (туру з'їли на її стартовій позиції)
// однаково відбирає право — тому перевіряємо і `from`, і `to` одним словником.
const ROOK_HOME_SQUARE_RIGHT = { a1: 'wQ', h1: 'wK', a8: 'bQ', h8: 'bK' };

function nextCastlingRights(current, { from, to, piece }) {
  const rights = { ...current };

  if (piece.toUpperCase() === 'K') {
    if (getPieceColor(piece) === COLORS.WHITE) {
      rights.wK = false;
      rights.wQ = false;
    } else {
      rights.bK = false;
      rights.bQ = false;
    }
  } else if (piece.toUpperCase() === 'R' && ROOK_HOME_SQUARE_RIGHT[from]) {
    // Важливо перевіряти саме тип фігури: клітинка a1/h1/a8/h8 могла вже
    // давно приймати іншу фігуру (наприклад, ферзя), і її від'їзд звідти
    // не повинен відбирати право рокіровки, яке стосується самої тури.
    rights[ROOK_HOME_SQUARE_RIGHT[from]] = false;
  }

  // А ось клітинку `to` перевіряємо завжди, незалежно від того, хто туди
  // прийшов, — це представляє "туру з'їли на її стартовій клітинці".
  if (ROOK_HOME_SQUARE_RIGHT[to]) rights[ROOK_HOME_SQUARE_RIGHT[to]] = false;

  return rights;
}

// enPassantTarget живе рівно один напівхід: встановлюється тільки одразу
// після ходу пішака на 2 клітинки, інакше завжди скидається в null.
function nextEnPassantTarget({ piece, from, to }) {
  if (piece.toUpperCase() !== 'P') return null;

  const { row: fromRow, col: fromCol } = algebraicToCoords(from);
  const { row: toRow } = algebraicToCoords(to);
  if (Math.abs(toRow - fromRow) !== 2) return null;

  const middleRow = (fromRow + toRow) / 2;
  return coordsToAlgebraic(middleRow, fromCol);
}

// Рокіровку розпізнаємо по ходу короля на 2 клітинки вбік — так само, як це
// робить будь-який UI, що диспатчить лише хід короля (uk клітинка тури не
// клікається окремо). Повертає, яку туру й куди довелось би пересунути.
const CASTLING_ROOK_MOVES = {
  e1: { g1: { from: 'h1', to: 'f1', side: 'K' }, c1: { from: 'a1', to: 'd1', side: 'Q' } },
  e8: { g8: { from: 'h8', to: 'f8', side: 'K' }, c8: { from: 'a8', to: 'd8', side: 'Q' } },
};

function getCastlingRookMove(piece, from, to) {
  if (piece.toUpperCase() !== 'K') return null;
  return CASTLING_ROOK_MOVES[from]?.[to] ?? null;
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setSelection: (state, action) => {
      state.selectedSquare = action.payload;
    },
    moveExecuted: (state, action) => {
      const { from, to, piece, promotion } = action.payload;

      // Знімок ПОЗИЦІЇ ДО ходу — потрібен нотації (крок 7,
      // docs/move-validation.md) для дизамбігуації: "чи могла інша фігура
      // цього ж типу так само легально піти на `to`". Робимо це ДО будь-яких
      // мутацій нижче, інакше "до ходу" й "після ходу" стане одним і тим
      // самим об'єктом.
      const gameStateBeforeMove = {
        board: { ...state.board },
        castlingRights: { ...state.castlingRights },
        enPassantTarget: state.enPassantTarget,
      };

      // Захоплюємо фігуру з `to` ДО перезапису — інакше вона губиться назавжди
      // (docs/move-validation.md, крок 2; потрібно для captured у
      // docs/move-notation.md, розділ 5).
      let captured = state.board[to] || null;

      // Взяття на проході: жертва стоїть НЕ на `to`, а поруч (той самий
      // ряд, що й `from`, той самий файл, що й `to`) — крок 4.
      const isEnPassantCapture =
        piece.toUpperCase() === 'P' && to === state.enPassantTarget && !captured;
      let enPassant = false;

      if (isEnPassantCapture) {
        const { row: fromRow } = algebraicToCoords(from);
        const { col: toCol } = algebraicToCoords(to);
        const capturedPawnSquare = coordsToAlgebraic(fromRow, toCol);
        captured = state.board[capturedPawnSquare];
        delete state.board[capturedPawnSquare];
        enPassant = true;
      }

      // Промоція: пішак, що доходить до протилежного останнього ряду,
      // ЗАВЖДИ перетворюється (це обов'язкове правило, не опція) — крок 6.
      // Вибір фігури — питання UI; тут лише безпечний дефолт (ферзь), якщо
      // конкретна фігура не передана.
      const isPromotion = requiresPromotion(piece, to);
      const pieceToPlace = isPromotion ? resolvePromotionPiece(piece, promotion) : piece;

      delete state.board[from];
      state.board[to] = pieceToPlace;

      // Рокіровка: якщо це king-move на 2 клітинки, пересуваємо й туру.
      const castlingRookMove = getCastlingRookMove(piece, from, to);
      let castling = null;
      if (castlingRookMove) {
        const rook = state.board[castlingRookMove.from];
        delete state.board[castlingRookMove.from];
        state.board[castlingRookMove.to] = rook;
        castling = castlingRookMove.side;
      }

      state.castlingRights = nextCastlingRights(state.castlingRights, { from, to, piece });
      state.enPassantTarget = nextEnPassantTarget({ piece, from, to });

      // Статус СУПЕРНИКА одразу після цього ходу — потрібен лише для
      // суфіксів SAN (+/#), крок 7. Партія тут НЕ завершується (isGameOver
      // не чіпаємо) — це відповідальність gameOperations.js/attemptMove
      // (крок 5), щоб не дублювати "коли партія закінчується" у двох місцях.
      const opponentColor = getOpponentColor(getPieceColor(piece));
      const gameStateAfterMove = {
        board: state.board,
        castlingRights: state.castlingRights,
        enPassantTarget: state.enPassantTarget,
      };
      const givesCheckmate = isCheckmate(gameStateAfterMove, opponentColor);
      const givesCheck = givesCheckmate || isCheck(state.board, opponentColor);

      const promotionPiece = isPromotion ? pieceToPlace.toUpperCase() : null;
      const san = buildSan(
        gameStateBeforeMove,
        { from, to, piece, captured, castling, promotion: promotionPiece },
        { isCheck: givesCheck, isCheckmate: givesCheckmate }
      );

      state.selectedSquare = null;
      state.history.push({
        ...action.payload,
        captured,
        castling,
        enPassant,
        promotion: promotionPiece,
        isCheck: givesCheck,
        isCheckmate: givesCheckmate,
        san,
      });
      state.plyCount += 1;
    },
    updateTime: (state, action) => {
      const { color, time } = action.payload;
      if (color === COLORS.WHITE) state.whiteTime = time;
      else state.blackTime = time;
    },
    newGameStarted: (state, action) => {
      const { time, side } = action.payload;
      return {
        ...initialState,
        whiteTime: time,
        blackTime: time,
        playerSide: side,
        gameId: state.gameId + 1,
      };
    },
    endGame: (state, action) => {
      state.winner = action.payload.winner;
      state.reason = action.payload.reason;
      state.isGameOver = true;
    },
  },
});

export const { setSelection, moveExecuted, newGameStarted, updateTime, endGame } =
  gameSlice.actions;
export default gameSlice.reducer;
