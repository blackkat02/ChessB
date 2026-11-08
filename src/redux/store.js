import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './game/gameSlice';
import uiReducer from './ui/uiSlice';
import { moveExecuted, endGame, newGameStarted } from './game/gameEvents';
import { savePersistedGame, loadPersistedGame } from './persistGame';

// docs/clock-and-game-record.md, крок 8: пишемо ЛИШЕ на дії, що реально
// міняють щось варте збереження — не на кожен dispatch (раніше сюди
// потрапляв і кожен тік годинника, розділ 2 того документа). Годинник сам
// по собі більше не дисптачить жодного action (Clock.jsx рахує "живий" час
// локально, лише форсуючи власний перерендер) — тож троттлити тут уже нема
// що троттлити, досить писати на самі ці три типи.
// Типи беремо з подій (.type), а не рядками — щоб не розійшлися.
const PERSIST_ON = new Set([
  moveExecuted.type,
  endGame.type,
  newGameStarted.type,
]);

const persistenceMiddleware = (storeApi) => (next) => (action) => {
  const result = next(action);

  if (PERSIST_ON.has(action.type)) {
    // Сирий стан, без жодних перетворень (докладно — розділ 6.1: без
    // компенсації за час, поки застосунок був закритий/у фоні — так само,
    // як на Lichess/Chess.com). selectedSquare свідомо не зберігається —
    // виділення клітинки після перезавантаження нікому не потрібне.
    const { game, ui } = storeApi.getState();
    savePersistedGame({ game, ui: { playerSide: ui.playerSide } });
  }

  return result;
};

const persisted = loadPersistedGame();
// `turnStartedAt` переноситься як є, БЕЗ скидання на "зараз" (розділ 6.1) —
// якщо партія була в процесі й час активного гравця вже вичерпався, поки
// застосунок був закритий, `selectClockRemaining` поверне 0 одразу на
// першому рендері, і useGameState.js завершить партію таймаутом сам,
// без окремого коду тут.
const preloadedState = persisted
  ? {
      game: persisted.game,
      // preloadedState замінює initialState слайсу, а не зливається з ним
      ui: { selectedSquare: null, playerSide: persisted.ui.playerSide },
    }
  : undefined;

export const store = configureStore({
  reducer: {
    game: gameReducer,
    ui: uiReducer,
  },
  preloadedState,
  // Вимикаємо перевірку на серіалізацію для спрощення MVP,
  // щоб Redux не сварився на складні об'єкти, якщо вони з'являться
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(persistenceMiddleware),
});
