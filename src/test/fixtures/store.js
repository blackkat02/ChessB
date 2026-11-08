// Фікстури рівня Redux. Свідомо НЕ ре-експортуються з ./index.js: його
// імпортують тести рушія, і тоді кожен з них тягнув би за собою gameSlice.
// Імпортуй напряму: '../../test/fixtures/store'.
import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../../redux/game/gameSlice';
import uiReducer from '../../redux/ui/uiSlice';
import { NO_CASTLING } from './castling';

/**
 * Стан слайсу `game` для тестів. Джерело істини — справжній initialState
 * редюсера, тож нові поля (як колись turnStartedAt) підхоплюються самі.
 * Порожня дошка — тому й без прав рокіровки: на порожній дошці їх нема чим
 * використати, а ALL_CASTLING тут суперечив би позиції.
 * Див. docs/test-fixtures.md, крок 4.
 */
export function makeSliceState(overrides = {}) {
  return {
    ...gameReducer(undefined, { type: '@@INIT' }),
    board: {},
    castlingRights: { ...NO_CASTLING },
    ...overrides,
  };
}

// Мінімальний ізольований store — без persist/localStorage побічних ефектів
// справжнього src/redux/store.js.
/**
 * @param {{} | undefined} gameStateOverrides
 */
export function createTestStore(gameStateOverrides) {
  return configureStore({
    reducer: {
      game: gameReducer,
      ui: uiReducer,
    },
    preloadedState: { game: makeSliceState(gameStateOverrides) },
  });
}
