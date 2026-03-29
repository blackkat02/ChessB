import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
import { DEFAULT_TIME } from './gameConstants';

const initialState = {
  board: initialBoardPiecesObject, // Об'єкт { a2: 'P', ... }
  turn: 'w', // 'w' або 'b'
  selectedSquare: null, // 'e2' або null
  whiteTime: DEFAULT_TIME,
  blackTime: DEFAULT_TIME,
  history: [],
  winner: null, // 'w', 'b', або 'draw'
  reason: null, // 'checkmate', 'timeout', 'resignation'
  isGameOver: false,
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
      state.turn = state.turn === 'w' ? 'b' : 'w';
      state.selectedSquare = null;
      state.history.push(action.payload);
    },
    updateTime: (state, action) => {
      const { color, time } = action.payload;
      if (color === 'w') state.whiteTime = time;
      else state.blackTime = time;
    },
    resetGame: () => initialState,
    endGame: (state, action) => {
      state.winner = action.payload.winner;
      state.reason = action.payload.reason;
      state.isGameOver = true;
      state.currentTurn = null; // Зупиняємо гру
    },
  },
});

export const { setSelection, moveExecuted, resetGame, updateTime } =
  gameSlice.actions;
export default gameSlice.reducer;
