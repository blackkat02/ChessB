// Фікстури рівня Redux. Свідомо НЕ ре-експортуються з ./index.js: його
// імпортують тести рушія, і тоді кожен з них тягнув би за собою gameSlice.
// Імпортуй напряму: '../../test/fixtures/store'.
import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../../redux/game/gameSlice';
import uiReducer from '../../redux/ui/uiSlice';
import positionReducer from '../../redux/position/positionSlice';
import { NO_CASTLING } from './castling';

/**
 * Стан слайсу `game` для тестів. Джерело істини — справжній initialState
 * редюсера, тож нові поля (як колись turnStartedAt) підхоплюються самі.
 * Див. docs/archive/test-fixtures.md, крок 4.
 */
export function makeSliceState(overrides = {}) {
  return {
    ...gameReducer(undefined, { type: '@@INIT' }),
    ...overrides,
  };
}

/**
 * Стан слайсу `position` для тестів. Порожня дошка — тому й без прав
 * рокіровки: на порожній дошці їх нема чим використати, а ALL_CASTLING тут
 * суперечив би позиції.
 */
export function makePositionState(overrides = {}) {
  return {
    ...positionReducer(undefined, { type: '@@INIT' }),
    board: {},
    castlingRights: { ...NO_CASTLING },
    ...overrides,
  };
}

// Мінімальний ізольований store — без persist/localStorage побічних ефектів
// справжнього src/redux/store.js. Форма аргументу повторює форму стану:
// { position, game } (docs/layer-separation-step4.md, 4.0).
/**
 * @param {{ position?: {}, game?: {} }} [overrides]
 */
export function createTestStore({ position, game, ...rest } = {}) {
  // Пласкі ключі ({ board, plyCount }) інакше мовчки відкидалися б, і тест
  // падав би далеко від причини — на порожній дошці чи DEFAULT_TIME.
  const unknownKeys = Object.keys(rest);
  if (unknownKeys.length > 0) {
    throw new Error(
      `createTestStore: невідомі ключі ${unknownKeys.join(', ')} — очікується форма { position, game }`
    );
  }

  return configureStore({
    reducer: { position: positionReducer, game: gameReducer, ui: uiReducer },
    preloadedState: {
      position: makePositionState(position),
      game: makeSliceState(game),
    },
  });
}
