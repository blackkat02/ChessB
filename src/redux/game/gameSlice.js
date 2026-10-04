import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
// import { getPieceColor, getOpponentColor } from '../../engine/chessHelpers';
// import { isCheck, isCheckmate } from '../../engine/gameStatus';
// import { buildSan } from '../../engine/notation';
import { DEFAULT_TIME, COLORS } from './gameConstants';

const initialState = {
  board: initialBoardPiecesObject, // Об'єкт { a2: 'P', ... }
  selectedSquare: null, // 'e2' або null
  whiteTime: DEFAULT_TIME,
  blackTime: DEFAULT_TIME,
  turnStartedAt: null, // Date.now() коли почала цокати активна сторона; null = годинники не йдуть (docs/clock-and-game-record.md, розділ 5.1)
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

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setSelection: (state, action) => {
      state.selectedSquare = action.payload;
    },
    moveExecuted: (state) => {
      // const { from, to, piece } = action.payload;

      // Знімок ПОЗИЦІЇ ДО ходу — потрібен нотації (крок 7,
      // docs/move-validation.md) для дизамбігуації: "чи могла інша фігура
      // цього ж типу так само легально піти на `to`". Робимо це ДО будь-яких
      // мутацій нижче, інакше "до ходу" й "після ходу" стане одним і тим
      // самим об'єктом.
      // const gameStateBeforeMove = {
      //   board: { ...state.board },
      //   castlingRights: { ...state.castlingRights },
      //   enPassantTarget: state.enPassantTarget,
      // };

      // Статус СУПЕРНИКА одразу після цього ходу — потрібен лише для
      // суфіксів SAN (+/#), крок 7. Партія тут НЕ завершується (isGameOver
      // не чіпаємо) — це відповідальність gameOperations.js/attemptMove
      // (крок 5), щоб не дублювати "коли партія закінчується" у двох місцях.
      // const opponentColor = getOpponentColor(getPieceColor(piece));
      // const gameStateAfterMove = {
      //   board: state.board,
      //   castlingRights: state.castlingRights,
      //   enPassantTarget: state.enPassantTarget,
      // };
      // const givesCheckmate = isCheckmate(gameStateAfterMove, opponentColor);
      // const givesCheck = givesCheckmate || isCheck(state.board, opponentColor);

      // const promotionPiece = isPromotion ? pieceToPlace.toUpperCase() : null;
      // const san = buildSan(
      //   gameStateBeforeMove,
      //   { from, to, piece, captured, castling, promotion: promotionPiece },
      //   { isCheck: givesCheck, isCheckmate: givesCheckmate }
      // );

      // const now = Date.now();

      // let moveTimeMs = 0;
      if (typeof state.turnStartedAt === 'number') {
        // moveTimeMs = now - state.turnStartedAt;
        // const moverColor = getPieceColor(piece);
        // if (moverColor === COLORS.WHITE) {
        //   state.whiteTime = Math.max(0, state.whiteTime - moveTimeMs);
        // } else {
        //   state.blackTime = Math.max(0, state.blackTime - moveTimeMs);
        // }
      }
      // state.turnStartedAt = now;

      // state.selectedSquare = null;
      // state.history.push({
      //   ...action.payload,
      //   captured,
      //   castling,
      //   enPassant,
      //   promotion: promotionPiece,
      //   isCheck: givesCheck,
      //   isCheckmate: givesCheckmate,
      //   san,
      //   timestamp: now,
      //   moveTimeMs,
      //   clockAfter: { w: state.whiteTime, b: state.blackTime },
      // });
      state.plyCount += 1;
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
      const { winner, reason, timedOutColor } = action.payload;

      if (
        reason === 'timeout' &&
        timedOutColor &&
        typeof state.turnStartedAt === 'number'
      ) {
        const elapsed = Date.now() - state.turnStartedAt;
        if (timedOutColor === COLORS.WHITE)
          state.whiteTime = Math.max(0, state.whiteTime - elapsed);
        else state.blackTime = Math.max(0, state.blackTime - elapsed);
      }

      state.winner = winner;
      state.reason = reason;
      state.isGameOver = true;
      state.turnStartedAt = null; // годинники завжди зупиняються, коли партія завершена
    },
  },
});

export const { setSelection, moveExecuted, newGameStarted, endGame } =
  gameSlice.actions;
export default gameSlice.reducer;
