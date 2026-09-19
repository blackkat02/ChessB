import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { STORAGE_KEY, SCHEMA_VERSION } from './persistGame';
import { moveExecuted, setSelection } from './game/gameSlice';
import { useGameState } from '../hooks/useGameState';
import Clock from '../components/Clock/Clock';
import { COLORS } from './game/gameConstants';

// store.js читає localStorage ОДИН раз, на рівні модуля, в момент імпорту
// (docs/clock-and-game-record.md, крок 8: `const persisted = loadPersistedGame()`
// виконується поза будь-якою функцією). Звичайний `import { store } from
// './store'` нагорі файлу підхопив би це рівно один раз для ВСІХ тестів —
// а нам потрібно кожного разу підставляти localStorage по-своєму ДО того,
// як store створиться. `vi.resetModules()` змушує наступний динамічний
// `import('./store')` виконати файл заново (включно з тим самим
// `loadPersistedGame()`), а не повернути закешований модуль із
// попереднього тесту.
async function importFreshStore() {
  vi.resetModules();
  const storeModule = await import('./store');
  return storeModule.store;
}

// Виявлення таймауту тепер живе в Clock.jsx, не в useGameState.js
// (docs/clock-and-game-record.md — переробка після знахідки "повний
// рендер сторінки"), тож для тесту "flag on reconnect" потрібен саме
// живий Clock, не голий useGameState() — та сама розводка пропсів, що й
// GameInfoPanel.jsx.
function Harness() {
  const { gameState, handleTimeUp } = useGameState();
  const isWhiteTurn = gameState.currentTurn === COLORS.WHITE;
  const isWhiteClockActive = isWhiteTurn && gameState.hasGameStarted;
  const isBlackClockActive = !isWhiteTurn && gameState.hasGameStarted;

  return (
    <>
      <Clock
        storedMs={gameState.whiteTime}
        turnStartedAt={gameState.turnStartedAt}
        color={COLORS.WHITE}
        isActive={isWhiteClockActive}
        isGameOver={gameState.isGameOver}
        onTimeUp={handleTimeUp}
      />
      <Clock
        storedMs={gameState.blackTime}
        turnStartedAt={gameState.turnStartedAt}
        color={COLORS.BLACK}
        isActive={isBlackClockActive}
        isGameOver={gameState.isGameOver}
        onTimeUp={handleTimeUp}
      />
    </>
  );
}

describe('redux store — відновлення зі збереженого стану (docs/clock-and-game-record.md, крок 9)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('без збереженого стану — store створюється з дефолтним initialState', async () => {
    const store = await importFreshStore();

    expect(store.getState().game.plyCount).toBe(0);
    expect(store.getState().game.turnStartedAt).toBeNull();
    expect(store.getState().game.history).toEqual([]);
  });

  it('зі збереженим станом — turnStartedAt переноситься БЕЗ змін, не скидається на "зараз" (розділ 6.1)', async () => {
    const T = 1_000_000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        savedAt: T,
        state: {
          board: {},
          plyCount: 1,
          isGameOver: false,
          turnStartedAt: T,
          whiteTime: 180000,
          blackTime: 180000,
          history: [],
        },
      })
    );

    const store = await importFreshStore();

    // Свідомо протилежний тест до того, що був у першій версії документа
    // (там ми скидали якір на Date.now() — саме це й давало небажану паузу).
    expect(store.getState().game.turnStartedAt).toBe(T);
  });

  it('якщо час уже вичерпався, поки застосунок був закритий, партія завершується таймаутом одразу після монтування ("flag on reconnect")', async () => {
    vi.useFakeTimers();
    const T = 1_000_000;
    vi.setSystemTime(T);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        savedAt: T,
        state: {
          board: {},
          selectedSquare: null,
          plyCount: 1, // непарне — хід чорних, саме їхній годинник іде
          isGameOver: false,
          winner: null,
          reason: null,
          turnStartedAt: T,
          whiteTime: 180000,
          blackTime: 500, // лишалось пів секунди
          history: [],
          playerSide: 'w',
          gameId: 0,
          castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
          enPassantTarget: null,
        },
      })
    );

    const store = await importFreshStore();

    // "Застосунок був закритий 10с" — рухаємо системний час УПЕРЕД, до
    // будь-якого рендеру (той самий прийом, що й у Кроці 4 для фонової
    // вкладки: реальний час минув, жоден React-рендер ще не відбувся).
    vi.setSystemTime(T + 10_000);

    render(
      <Provider store={store}>
        <Harness />
      </Provider>
    );

    // Перший тік Clock.jsx запланований з затримкою 0мс саме для цього
    // сценарію ("flag on reconnect") — але фейкові таймери все одно не
    // виконують його самі, доки не попросити: проганяємо те, що вже стоїть
    // у черзі (без ризику нескінченного циклу — тік, що завершує партію,
    // більше нічого не планує).
    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(store.getState().game.isGameOver).toBe(true);
    expect(store.getState().game.reason).toBe('timeout');
  });

  it('збережений стан з isGameOver: true — turnStartedAt лишається null, нічого не "оживає"', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        savedAt: Date.now(),
        state: {
          board: {},
          plyCount: 10,
          isGameOver: true,
          winner: 'w',
          reason: 'checkmate',
          turnStartedAt: null,
          whiteTime: 100000,
          blackTime: 50000,
          history: [],
        },
      })
    );

    const store = await importFreshStore();

    expect(store.getState().game.turnStartedAt).toBeNull();
    expect(store.getState().game.isGameOver).toBe(true);
  });

  it('dispatch(moveExecuted(...)) записує стан у localStorage; dispatch(setSelection(...)) — ні', async () => {
    const store = await importFreshStore();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    store.dispatch(setSelection('e2'));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // клік по клітинці — не привід писати на диск

    store.dispatch(moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw).state.plyCount).toBe(1);
  });
});
