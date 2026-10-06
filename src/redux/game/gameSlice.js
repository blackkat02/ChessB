import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
// Тимчасово, до кроку 3 (там це переїде в attemptMove):
import { getPieceColor, getOpponentColor } from '../../engine/chessHelpers';
import { isCheck, isCheckmate } from '../../engine/gameStatus';
import { buildSan } from '../../engine/notation';
import { DEFAULT_TIME, COLORS } from './gameConstants';
import { applyMove } from '../../engine';

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
  castlingRights: {
    whiteShort: true,
    whiteLong: true,
    blackShort: true,
    blackLong: true,
  },
  enPassantTarget: null, // клітинка, легальна для взяття на проході рівно один напівхід
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setSelection: (state, action) => {
      state.selectedSquare = action.payload;
    },
    moveExecuted: (state, action) => {
      const { from, to, piece } = action.payload;

      // Позиція ДО ходу. Копія не потрібна: applyMove вхід не мутує,
      // тож `before` лишається "до" і для нотації (дизамбігуація в SAN).
      const before = {
        board: state.board,
        castlingRights: state.castlingRights,
        enPassantTarget: state.enPassantTarget,
      };

      const { position, details } = applyMove(before, action.payload);

      state.board = position.board;
      state.castlingRights = position.castlingRights;
      state.enPassantTarget = position.enPassantTarget;

      // Тимчасово в редюсері — на кроці 3 час прийде в payload.timestamp.
      const opponentColor = getOpponentColor(getPieceColor(piece));
      const givesCheckmate = isCheckmate(position, opponentColor);
      const givesCheck =
        givesCheckmate || isCheck(position.board, opponentColor);
      const san = buildSan(
        before,
        {
          from,
          to,
          piece,
          captured: details.captured,
          castling: details.castling,
          promotion: details.promotion,
        },
        { isCheck: givesCheck, isCheckmate: givesCheckmate }
      );

      const now = Date.now();

      let moveTimeMs = 0;
      if (typeof state.turnStartedAt === 'number') {
        moveTimeMs = now - state.turnStartedAt;
        const moverColor = getPieceColor(piece);
        if (moverColor === COLORS.WHITE) {
          state.whiteTime = Math.max(0, state.whiteTime - moveTimeMs);
        } else {
          state.blackTime = Math.max(0, state.blackTime - moveTimeMs);
        }
      }

      state.turnStartedAt = now; // ← годинник наступної сторони стартує з цієї миті

      state.selectedSquare = null;
      state.history.push({
        ...action.payload,
        ...details,
        isCheck: givesCheck,
        isCheckmate: givesCheckmate,
        san,
        timestamp: now,
        moveTimeMs,
        clockAfter: { w: state.whiteTime, b: state.blackTime },
      });
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
