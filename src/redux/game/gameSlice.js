import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
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
  castlingRights: {
    whiteShort: true,
    whiteLong: true,
    blackShort: true,
    blackLong: true,
  },
  enPassantTarget: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setSelection: (state, action) => {
      state.selectedSquare = action.payload;
    },
    // Лише запис готового результату: позицію, статус, SAN і мить ходу
    // порахував attemptMove (docs/layer-separation-step3.md, 3.5). Редюсер
    // не знає шахових правил і не викликає Date.now() — той самий action
    // завжди дає той самий стан.
    moveExecuted: (state, action) => {
      const {
        move,
        color,
        position,
        details,
        isCheck,
        isCheckmate,
        san,
        timestamp,
        analysis,
      } = action.payload;

      state.board = position.board;
      state.castlingRights = position.castlingRights;
      state.enPassantTarget = position.enPassantTarget;

      let moveTimeMs = 0;
      if (typeof state.turnStartedAt === 'number') {
        moveTimeMs = timestamp - state.turnStartedAt;
        if (color === COLORS.WHITE) {
          state.whiteTime = Math.max(0, state.whiteTime - moveTimeMs);
        } else {
          state.blackTime = Math.max(0, state.blackTime - moveTimeMs);
        }
      }

      state.turnStartedAt = timestamp; // ← годинник наступної сторони стартує з цієї миті

      state.selectedSquare = null;
      state.history.push({
        ...move,
        // details другим: details.promotion (розв'язана 'Q') перекриває
        // move.promotion (може бути undefined).
        ...details,
        isCheck,
        isCheckmate,
        san,
        timestamp,
        moveTimeMs,
        clockAfter: { w: state.whiteTime, b: state.blackTime },
        // Лише коли true — як раніше, коли прапорець приходив через
        // ...action.payload. Інакше кожен хід отримав би analysis: undefined.
        ...(analysis && { analysis }),
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
