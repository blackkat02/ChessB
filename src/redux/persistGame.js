// docs/clock-and-game-record.md, крок 7. Окремо від store.js навмисно —
// щоб тестувати без Redux і без підключення до реального localStorage
// браузера (jsdom у тестах дає справжній localStorage, тож навіть тут
// нічого мокати не треба).
export const STORAGE_KEY = 'chessb:v1:game';
// 2, не 1 — payload тепер містить clockAfter/timestamp в history (крок 6).
export const SCHEMA_VERSION = 2;

export function savePersistedGame(gameState) {
  try {
    const payload = { version: SCHEMA_VERSION, savedAt: Date.now(), state: gameState };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Не вдалося зберегти стан:', err);
  }
}

export function loadPersistedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const payload = JSON.parse(raw);
    if (payload.version !== SCHEMA_VERSION) return undefined;
    return payload.state;
  } catch {
    return undefined;
  }
}
