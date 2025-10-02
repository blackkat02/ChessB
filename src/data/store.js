import { configureStore, combineReducers  } from '@reduxjs/toolkit';
import { positionsSliceReducer } from './positionsSlice';
import filtersSliceReducer from './filtersSlice';

const rootReducer = combineReducers({
  contacts: positionsSliceReducer,
  filters: filtersSliceReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});
