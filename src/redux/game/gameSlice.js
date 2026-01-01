import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
import { DEFAULT_TIME } from './gameConstants';

const initialState = {
  board: initialBoardPiecesObject,
  turn: 'w',
  selectedSquare: null,
  whiteTime: DEFAULT_TIME,
  blackTime: DEFAULT_TIME,
  history: [],
  isLoading: false, // Заглушка для асинхронних запитів до двигуна/сервера
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // 1. Вибір клітинки
    setSelection: (state, action) => {
      state.selectedSquare = action.payload;
    },
    // 2. Базове переміщення (заглушка для рендерингу)
    moveExecuted: (state, action) => {
      const { from, to, piece } = action.payload;
      delete state.board[from];
      state.board[to] = piece;
      state.turn = state.turn === 'w' ? 'b' : 'w';
      state.selectedSquare = null;
      state.history.push(action.payload);
    },
    // 3. Заглушка для валідації (поки що просто логування)
    validationStarted: (state) => {
      state.isLoading = true;
    },
    resetGame: (state) => {
      return initialState;
    },
  },
});

export const { setSelection, moveExecuted, resetGame, validationStarted } =
  gameSlice.actions;
export default gameSlice.reducer;
