import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './game/gameSlice';

// 1. Створюємо store
export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
  // Вимикаємо перевірку на серіалізацію для спрощення MVP,
  // щоб Redux не сварився на складні об'єкти, якщо вони з'являться
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// 2. Твоє завдання: Ручне збереження в LocalStorage
store.subscribe(() => {
  const state = store.getState();
  try {
    const serializedState = JSON.stringify(state.game);
    localStorage.setItem('chess_game_state', serializedState);
  } catch (err) {
    console.error('Не вдалося зберегти стан:', err);
  }
});

// ВАЖЛИВО: Ми експортуємо 'store' як іменований експорт (named export)
// Це саме те, що шукає твій main.jsx: import { store } from ...
