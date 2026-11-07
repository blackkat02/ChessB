import { createSlice } from '@reduxjs/toolkit';
import { COLORS } from '../game/gameConstants';
import { moveExecuted, newGameStarted } from '../game/gameEvents';

const initialState = {
  selectedSquare: null,
  playerSide: COLORS.WHITE,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelection: (state, action) => {
      state.selectedSquare = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(moveExecuted, (state) => {
        state.selectedSquare = null;
      })
      .addCase(newGameStarted, (state, action) => {
        state.selectedSquare = null;
        state.playerSide = action.payload.side;
      });
  },
});

export const { setSelection } = uiSlice.actions;
export default uiSlice.reducer;
