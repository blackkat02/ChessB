import { createSlice, createSelector } from '@reduxjs/toolkit';
import { initialPosition } from './positions';

export const positionsSlice = createSlice({
  name: 'positions',
  initialState: {
    board: initialPosition,
    currentPlayer: 'white',
    history: [],

    // isLoading: false,
    // isError: false,
  },
  reducers: {
    changePositions(state, action) {
      state.board = action.payload;

      state.currentPlayer = state.currentPlayer === 'white' ? 'black' : 'white';

      state.history.push({
        board: action.payload,
        player: state.currentPlayer
      });
    }
  },
})

export const { changePositions } = changePositions.actions;