import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
import { DEFAULT_TIME, COLORS } from './gameConstants';
import { moveExecuted, newGameStarted, endGame } from './gameEvents';

const initialState = {
  board: initialBoardPiecesObject, // Об'єкт { a2: 'P', ... }
  // selectedSquare: null, // 'e2' або null
  whiteTime: DEFAULT_TIME,
  blackTime: DEFAULT_TIME,
  turnStartedAt: null, // Date.now() коли почала цокати активна сторона; null = годинники не йдуть (docs/clock-and-game-record.md, розділ 5.1)
  history: [],
  turn: COLORS.WHITE,
  plyCount: 0, // кількість зроблених напівходів (ходи = plyCount пар для запису партії)
  winner: null, // COLORS.WHITE, COLORS.BLACK, або 'draw'
  reason: null, // 'checkmate', 'timeout', 'resignation'
  isGameOver: false,
  // playerSide: COLORS.WHITE, // якою стороною грає гравець за цим пристроєм (впливає лише на орієнтацію дошки)
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
  // reducers: {
  //   setSelection: (state, action) => {
  //     state.selectedSquare = action.payload;
  //   },
  // },
  // Події партії (gameEvents.js): слайс лише реагує на них, на ті самі
  // події реагуватимуть і інші слайси (docs/layer-separation-step4.md, 4.2).
  extraReducers: (builder) => {
    builder
      // Лише запис готового результату: позицію, статус, SAN і мить ходу
      // порахував attemptMove (docs/layer-separation-step3.md, 3.5). Редюсер
      // не знає шахових правил і не викликає Date.now() — той самий action
      // завжди дає той самий стан.
      .addCase(moveExecuted, (state, action) => {
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
        state.turn = position.turn;

        let moveTimeMs = 0;
        if (typeof state.turnStartedAt === 'number') {
          moveTimeMs = timestamp - state.turnStartedAt;
          if (color === COLORS.WHITE) {
            state.whiteTime = Math.max(0, state.whiteTime - moveTimeMs);
          } else {
            state.blackTime = Math.max(0, state.blackTime - moveTimeMs);
          }
        }

        state.turnStartedAt = timestamp;

        state.history.push({
          ...move,
          ...details,
          isCheck,
          isCheckmate,
          san,
          timestamp,
          moveTimeMs,
          clockAfter: { w: state.whiteTime, b: state.blackTime },
          ...(analysis && { analysis }),
        });
        state.plyCount += 1;
      })
      .addCase(newGameStarted, (state, action) => {
        const { time } = action.payload;
        return {
          ...initialState,
          whiteTime: time,
          blackTime: time,
          gameId: state.gameId + 1,
        };
      })
      .addCase(endGame, (state, action) => {
        const { winner, reason, timedOutColor, timestamp } = action.payload;

        if (
          reason === 'timeout' &&
          timedOutColor &&
          typeof state.turnStartedAt === 'number'
        ) {
          const elapsed = timestamp - state.turnStartedAt;
          if (timedOutColor === COLORS.WHITE)
            state.whiteTime = Math.max(0, state.whiteTime - elapsed);
          else state.blackTime = Math.max(0, state.blackTime - elapsed);
        }

        state.winner = winner;
        state.reason = reason;
        state.isGameOver = true;
        state.turnStartedAt = null;
      });
  },
});

// export const { setSelection } = gameSlice.actions;
export default gameSlice.reducer;
