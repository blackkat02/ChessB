export const DEFAULT_TIME = 180000;
export const COLORS = { WHITE: 'w', BLACK: 'b' };

export const TIME_CONTROLS = [
  { label: '1 хв', value: 60000 },
  { label: '3 хв', value: 180000 },
  { label: '5 хв', value: 300000 },
  { label: '10 хв', value: 600000 },
];

export const SIDE_OPTIONS = {
  WHITE: COLORS.WHITE,
  BLACK: COLORS.BLACK,
  RANDOM: 'random',
};

// Нижче цього залишку годинник показує десяті долі секунди й тікає частіше
// (docs/clock-and-game-record.md) — так само, як на Lichess/Chess.com: в
// останні секунди партії десяті частки дають гравцю точніший орієнтир, ніж
// округлення до цілої секунди. Спільна константа для Clock.jsx (як
// форматувати) і useGameState.js (як часто форсувати перерендер) — обидва
// мають узгоджуватись на одному й тому самому порозі.
export const LOW_TIME_THRESHOLD_MS = 10000;
