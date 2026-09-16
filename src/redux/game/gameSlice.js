import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
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
      delete state.board[from];
      state.board[to] = piece;
      state.selectedSquare = null;
      state.history.push(action.payload);
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

export const { setSelection, moveExecuted, newGameStarted, updateTime } =
  gameSlice.actions;
export default gameSlice.reducer;
