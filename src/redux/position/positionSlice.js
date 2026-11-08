import { createSlice } from '@reduxjs/toolkit';
import { initialBoardPiecesObject } from '../../data/positions';
import { COLORS } from '../game/gameConstants';
import { moveExecuted, newGameStarted } from '../game/gameEvents';

const initialState = {
  board: initialBoardPiecesObject,
  turn: COLORS.WHITE,
  castlingRights: {
    whiteShort: true,
    whiteLong: true,
    blackShort: true,
    blackLong: true,
  },
  enPassantTarget: null,
};

const positionSlice = createSlice({
  name: 'position',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(moveExecuted, (state, action) => action.payload.position)
      .addCase(newGameStarted, () => {
        return initialState;
      });
  },
});

export default positionSlice.reducer;
