# Крок 4: слайси `position`, `game`, `ui`

Дата: 2026-11-03. Доповнення до `docs/layer-separation.md`, розділ 7.
Формат: таска від ментора, як `layer-separation-step3.md`. Готові розв'язки
сховані під спойлерами. Спершу спробуй сам.

## 0. Де ти зараз

| Крок | Стан |
|---|---|
| 1. Константи | ✅ |
| 2. `applyMove` | ✅ |
| 3. Товстий thunk | ✅ (`docs/layer-separation-step3.md`) |
| 4. Слайси | ⬜ цей документ |
| 5. UI через селектори + ESLint | ⬜ |

Відкрите питання з `layer-separation.md` (чий `turn`) вирішене:
**`turn` — частина `position`** (розділ 3 нижче).

Прогрес по підкроках (станом на 2026-11-08):

| Підкрок | Стан | Де |
|---|---|---|
| 4.0. Тести через селектори | 🔄 `createTestStore({ position, game })` вкладений і кидає на пласкі ключі; тести досі читають `getState().<slice>.*` напряму, не через селектори | `766c287` |
| 4.1. `turn` у позиції | ✅ `SCHEMA_VERSION` 3 → 4 | `5689fc6` |
| 4.2. `gameEvents.js` | ✅ | `654a807`, `livecoding-02-game-events.md` |
| 4.3. Слайс `ui` | ✅ разом із persist `playerSide`, `SCHEMA_VERSION` 4 → 5 | `66dfdf8`, `cf567bb`, `livecoding-03-ui-slice.md` |
| 4.4. Слайс `position` | ✅ | `766c287`, `livecoding-04-position-slice.md` |
| 4.5. `selectLegalTargets` | ⬜ | `livecoding-05-legal-targets.md` |
| 4.6. Persist | ✅ `{ position, game, ui: { playerSide } }`, `SCHEMA_VERSION` 5 → 6 (разом з 4.4) | `766c287` |
| 4.7. Прибирання | ⬜ | — |

**Версії схеми розійшлися з початковим планом.** План розраховував на
одне підвищення до 4 наприкінці кроку. Насправді 4 зайняв підкрок 4.1, 5 —
підкрок 4.3, тож persist позиції (4.4/4.6) — це **6**. Нижче в тексті
«`SCHEMA_VERSION = 4`» читай як «наступна вільна версія».

## 1. Що не так зараз

Після кроку 3 редюсер `game` уже не знає шахових правил, але сам стан
досі змішує три різні світи в одному об'єкті `state.game`:

| Поле | Що це насправді | Хто його змінює |
|---|---|---|
| `board`, `castlingRights`, `enPassantTarget` | **позиція** — вхід для рушія | лише хід (`moveExecuted`) і нова партія |
| `history`, `plyCount`, годинники, `turnStartedAt`, `winner`, `reason`, `isGameOver`, `gameId` | **запис партії** | хід, кінець партії, нова партія |
| `selectedSquare`, `playerSide` | **стан екрана** | клік по клітинці, вибір сторони |

Наслідки:

- **`turn` прихований у `plyCount % 2`.** Правило «хто ходить» залежить від
  лічильника історії (розділ 3).
- **Persist зберігає зайве.** `selectedSquare` — це клік, а потрапляє в
  `localStorage` разом із партією.
- **Назва `game` нічого не каже.** З `state.game.board` не видно, що це
  вхід рушія, а з `state.game.selectedSquare` — що це UI.

## 2. Таска

**Розбий `state.game` на три слайси за доменами — `position`, `game`, `ui` —
і зроби `turn` полем позиції.** Поведінка гри для користувача не змінюється,
крім одного: стара збережена партія після деплою не відновиться
(`SCHEMA_VERSION` підвищується; фактично 3 → 6 за три підкроки, див. розділ 0).

Критерії готовності:

1. `state.game` не містить ні `board`, ні `castlingRights`, ні
   `enPassantTarget`, ні `selectedSquare`, ні `playerSide`.
2. `state.position` = `{ board, castlingRights, enPassantTarget, turn }`,
   `state.ui` = `{ selectedSquare, playerSide }`.
3. `applyMove` повертає позицію з перемкненим `turn`;
   `selectCurrentTurn` читає `state.position.turn`, а не `plyCount`.
4. Події `moveExecuted`, `newGameStarted`, `endGame` оголошені в
   `src/redux/game/gameEvents.js`; слайси не імпортують один одного.
5. `selectIsFriendlyFire` і `selectIsMovePossible` замінені одним
   мемоізованим `selectLegalTargets`.
6. Persist зберігає `{ position, game, ui: { playerSide } }`,
   `SCHEMA_VERSION = 6`. Партія відновлюється після перезавантаження.
7. `npm test` і `npm run lint` зелені, жоден тест не видалено без заміни.

## 3. Рішення про `turn` (для опису коміту)

`turn` переходить у `position`, `plyCount` лишається в `game`. Обґрунтування:

- **Це два різні питання.** `plyCount` — скільки ходів зроблено в цій партії
  (запис). `turn` — хто ходить у цій позиції (правило). Вони збігаються лише
  при старті зі стандартної позиції й ходах строго по черзі.
- **FEN тримає їх окремо.** Поле 2 — хто ходить, поле 6 — номер ходу. Поля
  1–4 FEN — це рівно наш `position` (`docs/next-steps.md`, крок 9).
- **Рушій отримує повну позицію.** Ті самі фігури з різною чергою — різні
  позиції (пат для одного кольору — звичайна позиція для іншого).
- **Режим аналізу.** Після двох ходів білих поспіль `plyCount % 2` рахує
  кліки; `turn` після ходу білих завжди `'b'`.
- **Ціна:** нове поле, що формально дублює `plyCount % 2` у звичайній грі.
  Розходитися їм нема як: `position` змінює лише `applyMove`, `plyCount` —
  лише редюсер `game`.

## 4. Покроковий план

### Чому саме такий порядок

Найбільший ризик кроку — не код слайсів, а тести: 22 читання
`getState().game.*` у `gameOperations.test.js`, ще 11 у `useGameState.test.jsx`
і `store.test.jsx`, 21 виклик `createTestStore` з плоскими overrides. Якщо
розбивати стан одразу, усе це впаде одночасно — як `moveExecuted` на кроці 3.

Тому той самий прийом, що в 3.3: **спершу переводимо тести на форму, яка
переживе розбиття**, і лише потім розбиваємо.

```
4.0 Тести через селектори, вкладений createTestStore ──┐ готуємо ґрунт,
4.1 turn у позиції (ще всередині state.game)            ─┤ стан ще один
4.2 gameEvents.js                                       ─┘
4.3 Слайс ui                                            ──┐ розбиття,
4.4 Слайс position                                      ──┘ по одному слайсу
4.5 selectLegalTargets
4.6 Persist + SCHEMA_VERSION 6
4.7 Прибирання, документи
```

Після кожного підкроку `npm test` зелений. Комітити можна по підкроках, як
на кроці 3.

### 4.0. Тести, що переживуть розбиття

1. **Читання стану в тестах — через селектори.**
   `store.getState().game.board` → `selectBoard(store.getState())`,
   `.game.history` → `selectMoveHistory(...)`, `.game.isGameOver` →
   `selectIsGameOver(...)` тощо. Шлях до поля знатиме лише селектор, тож на
   4.3–4.4 тести не зміняться. Якщо для поля селектора немає (наприклад,
   `turnStartedAt`, `selectedSquare` у `useGameState.test.jsx`) — додай його
   в `gameSelectors.js`; на кроці 5 він однаково знадобиться UI.
2. **`createTestStore` приймає вкладену форму:**
   `createTestStore({ position: {...}, game: {...}, ui: {...} })`.
   Поки слайс один, фікстура тимчасово зливає все в `game`:

   ```js
   // ТИМЧАСОВО до 4.3/4.4: один слайс, тож три частини зливаються в game.
   export function createTestStore({ position = {}, game = {}, ui = {} } = {}) {
     return configureStore({
       reducer: { game: gameReducer },
       preloadedState: { game: makeSliceState({ ...position, ...game, ...ui }) },
     });
   }
   ```

   Усі 21 виклик переводяться на нову форму:
   `createTestStore({ board: {...}, plyCount: 1 })` →
   `createTestStore({ position: { board: {...} }, game: { plyCount: 1 } })`.
   Механічно, але саме цей diff і є «підготовка»: на 4.3/4.4 зміниться лише
   тіло `createTestStore`, а не 21 тест.

Чому не «розумна» фікстура, що сама розкладає плоскі ключі по слайсах:
тест має показувати форму стану, яку перевіряє. Магічний розподіл ховає
саме те, що ми на цьому кроці робимо явним.

**Коміт:** `test: read state via selectors, nest createTestStore by slice`

### 4.1. `turn` у позиції

Поки що поле живе в `state.game` — слайси ще не розбиті. Мета підкроку —
змінити **рушій і контракт** окремо від переїзду стану.

1. **Рушій.** `applyMove` повертає `turn: getOpponentColor(getPieceColor(piece))`.
   Колір — з фігури, як у `buildMovePayload`: у режимі аналізу черга не
   перевіряється. Онови JSDoc контракту. Тест: хід білих → `turn: 'b'`,
   хід чорних → `'w'`, вхідна позиція не змінилась.
2. **`getStatus`** (необов'язково, але зручно): `color = position.turn` за
   замовчуванням — `getStatus(position)` без другого аргументу. Старі виклики
   з кольором працюють як раніше.
3. **Фікстури.** `makeGameState`: `turn: 'w'` за замовчуванням.
   `makeMovePayload`: `position.turn: 'b'` (після ходу білих e2-e4).
4. **Стан.** `initialState.turn = COLORS.WHITE`; `moveExecuted` присвоює
   `state.turn = position.turn`; `selectPosition` додає `turn`.
5. **`selectCurrentTurn`** читає `state.game.turn`. Коментар
   «turn — похідне значення» прибери — він більше не правда.

Пастка — **тести, де черга задавалась через `plyCount`.** У
`gameSelectors.test.js` (`selectClockRemaining`), `store.test.jsx`
(збережений стан з `plyCount: 1, // хід чорних`) і `gameOperations.test.js`
(`plyCount: 1` для ходу чорних) тепер треба явно задати `turn: 'b'` у
позиції. Саме ці тести й показують різницю двох підходів: раніше `plyCount`
означав і «скільки ходів», і «хто ходить»; тепер це два поля.

`plyCount` нікуди не дівається: `selectHasGameStarted` і годинник
(`plyCount > 0`) далі на ньому.

**Коміт:** `refactor(engine): make turn part of position`

### 4.2. Події окремо від слайсів: `gameEvents.js`

На 4.3–4.4 три слайси реагуватимуть на ті самі дії. Якщо `positionSlice`
імпортує `moveExecuted` з `gameSlice`, а `gameSlice` колись захоче щось із
`positionSlice` — цикл. Тому дії-події виносяться в окремий модуль, який не
імпортує жодного слайсу.

```js
// src/redux/game/gameEvents.js
import { createAction } from '@reduxjs/toolkit';

export const moveExecuted = createAction('game/moveExecuted');
export const newGameStarted = createAction('game/newGameStarted');
export const endGame = createAction('game/endGame', (payload) => ({
  payload: { timestamp: Date.now(), ...payload },
}));
```

- **Типи ті самі** (`'game/...'`), тож `PERSIST_ON` у `store.js` не
  змінюється, а тест «prepare додає поточну мить» з кроку 3.6 перевіряє
  тепер `createAction`.
- **`prepare` переїжджає** другим аргументом `createAction` — це той самий
  механізм, що `{ reducer, prepare }` у `createSlice`.
- **`gameSlice`** обробляє події через `extraReducers`:
  `builder.addCase(moveExecuted, (state, action) => {...})`. У `reducers`
  лишається тільки `setSelection` (до 4.3).
- **Імпорти.** `gameOperations.js`, `useGameState.js` і тести беруть події з
  `gameEvents.js`, `setSelection` — поки з `gameSlice`.

<details>
<summary>Розв'язок: <code>gameSlice</code> з <code>extraReducers</code></summary>

```js
const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setSelection: (state, action) => {
      state.selectedSquare = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(moveExecuted, (state, action) => { /* тіло з кроку 3.5 */ })
      .addCase(newGameStarted, (state, action) => { /* як було */ })
      .addCase(endGame, (state, action) => { /* тіло reducer з 3.6 */ });
  },
});

export const { setSelection } = gameSlice.actions;
export default gameSlice.reducer;
```

</details>

**Коміт:** `refactor(redux): declare game events with createAction`

### 4.3. Слайс `ui`

`src/redux/ui/uiSlice.js` — `{ selectedSquare: null, playerSide: COLORS.WHITE }`.

- Власний редюсер `setSelection`. **Тип зміниться** на `'ui/setSelection'` —
  це нормально: його немає в `PERSIST_ON`, а `store.test.jsx` перевіряє саме
  те, що вибір клітинки **не** пишеться на диск.
- `extraReducers`: `moveExecuted` → `selectedSquare = null`;
  `newGameStarted` → `{ selectedSquare: null, playerSide: action.payload.side }`.
- `src/redux/ui/uiSelectors.js`: `selectSelectedSquare`, `selectPlayerSide`.
  Назви ті самі, змінюється шлях — і імпорти в `useGameState.js`,
  `ChessBoardContainer.jsx`.
- `resignGame` читає `playerSide` через `selectPlayerSide(getState())`, а не
  з `getState().game`.
- З `gameSlice` прибери ці два поля і `setSelection`, з `moveExecuted` і
  `newGameStarted` — їхні присвоєння.
- `store.js`: `reducer: { game, ui }`. `createTestStore`: `ui` тепер іде у
  власний слайс, а не зливається в `game`.

Тести: `src/redux/ui/uiSlice.test.js` — `setSelection`, скидання на
`moveExecuted`, `playerSide` з `newGameStarted`. Тест «знімає виділення» з
`gameSlice.test.js` переїжджає сюди.

**Коміт:** `refactor(redux): extract ui slice (selectedSquare, playerSide)`

### 4.4. Слайс `position`

`src/redux/position/positionSlice.js` — `{ board, castlingRights,
enPassantTarget, turn }`. Власних `reducers` **немає**: позицію змінюють
лише події.

```js
extraReducers: (builder) => {
  builder
    .addCase(moveExecuted, (_state, action) => action.payload.position)
    .addCase(newGameStarted, () => initialState);
},
```

`return action.payload.position` замінює стан цілком. Це свідомо: позицію
порахував рушій, слайсу нема чого в ній «оновлювати по полях». З Immer
повернути новий об'єкт — легальний спосіб замінити стан.

- `src/redux/position/positionSelectors.js`: `selectBoard`, `selectPosition`,
  `selectCurrentTurn`, `selectIsWhiteTurn`, `selectPieceAtSquare`,
  `selectIsSquareEmpty`, `selectPieceColorAt`, `selectIsOwnPiece`. Назви ті
  самі, шлях — `state.position`.
- **`selectPosition` спрощується:** `(state) => state.position`. Мемоізація
  через `createSelector` більше не потрібна — це вже один об'єкт у стані,
  той самий референс, поки його не замінить `moveExecuted`.
- **`selectClockRemaining`** лишається в `gameSelectors.js`, але чергу
  бере через `selectCurrentTurn` з `positionSelectors.js`. Перехресне
  читання між селекторами різних слайсів — нормально; заборонено лише
  слайсам імпортувати один одного.
- З `gameSlice` прибери чотири поля позиції та їхні присвоєння.
  `initialBoardPiecesObject` тепер потрібен лише `positionSlice`.
- `store.js`: `reducer: { position, game, ui }`. `createTestStore`: три
  окремі слайси, тимчасове злиття з 4.0 зникає повністю.

Тести: `src/redux/position/positionSlice.test.js` — `moveExecuted` кладе
`payload.position` як є; `newGameStarted` повертає початкову позицію з
`turn: 'w'`. Тест «бере board, castlingRights і enPassantTarget з
payload.position» з `gameSlice.test.js` переїжджає сюди.

Готово, коли: `Object.keys(store.getState().game)` не містить жодного поля
позиції чи UI.

**Коміт:** `refactor(redux): extract position slice`

### 4.5. `selectLegalTargets` замість валідаційних селекторів

`selectIsFriendlyFire` і `selectIsMovePossible` (`gameSelectors.js`, розділ 4)
дублюють рушій гіршою версією: вони не знають ні геометрії, ні шаху. Після
кроку 3 їх ніхто не викликає, тестів на них немає, а `selectIsFriendlyFire`
ще й пише в консоль.

```js
// positionSelectors.js
export const selectLegalTargets = createSelector(
  [selectPosition, selectSelectedSquare],
  (position, from) => (from ? getLegalMoves(position, from) : [])
);
```

- **Чому селектор, а не поле стану.** Легальні ходи повністю визначаються
  позицією і вибраною клітинкою — це похідні дані. Якщо зберігати їх у
  стані, їх треба оновлювати на кожен хід і клік, і вони можуть розійтися з
  позицією.
- **Чому `createSelector`.** `getLegalMoves` симулює ходи й рахує атаки —
  дорого. Без мемоізації кожен рендер дошки рахував би заново.
- Імпорт `getLegalMoves` — з `'../../engine'`.

Тести: порожній вибір → `[]`; вибрана фігура → її легальні ходи; повторний
виклик з тим самим станом повертає **той самий референс** (як тест
мемоізації `selectMovePairs`).

Підсвітку легальних полів у UI цей підкрок **не** додає — це нова фіча, а
крок 4 — рефакторинг. Запиши її в `docs/next-steps.md`.

**Коміт:** `refactor(redux): replace validation selectors with selectLegalTargets`

### 4.6. Persist і `SCHEMA_VERSION = 6`

Частково зроблено на 4.3: збереження вже має форму
`{ game, ui: { playerSide } }`, `SCHEMA_VERSION = 5`, `preloadedState`
доповнює `selectedSquare: null`, тести в `store.test.jsx` — нової форми.
Лишається додати `position`.

1. **Що зберігаємо.** `persistenceMiddleware` зберігає
   `{ position, game, ui: { playerSide } }`. `selectedSquare` не
   зберігається: це клік, а не партія.
2. **`SCHEMA_VERSION = 6`** у `persistGame.js`, з рядком у коментарі-історії
   версій: `6 — позиція в окремому ключі position`.
3. **`preloadedState`.** `loadPersistedGame` повертає збережений об'єкт;
   `store.js` кладе його в `preloadedState` **з доповненням `ui`**.

Пастка п. 3: `preloadedState` для слайсу **замінює** його `initialState`
повністю, а не зливається з ним. Якщо передати `ui: { playerSide: 'b' }`,
то `selectedSquare` буде `undefined`, а не `null`. Тому:

```js
const preloadedState = persisted
  ? { ...persisted, ui: { selectedSquare: null, ...persisted.ui } }
  : undefined;
```

Тести:

- `persistGame.test.js`: старий тест «версія `SCHEMA_VERSION - 1`
  ігнорується» тепер перевіряє саме збереження версії 5.
- `store.test.jsx`: збережені стани в тестах — нової форми
  (`{ position, game, ui }`); перевір, що `selectedSquare` після відновлення
  `null`, а не `undefined`; що `setSelection` досі не пише на диск.

У браузері: зіграй кілька ходів, перезавантаж сторінку — партія, годинники
й сторона гравця відновились. Потім вручну поклади в `localStorage`
збереження версії 5 (або просто збережене до деплою) — застосунок стартує з
нової партії без помилок.

**Коміт:** `refactor(redux): persist position/game/ui, bump SCHEMA_VERSION to 6`

### 4.7. Прибирання і документи

- `gameSelectors.js` містить лише селектори запису партії: історія, пари
  ходів, годинники, результат, `gameId`, `plyCount`.
- `src/test/fixtures/store.js`: `makeSliceState` → три білдери
  (`makePositionState`, `makeGameSliceState`, `makeUiState`), кожен на
  основі `initialState` свого редюсера. Онови `docs/test-fixtures.md`.
- `gameSlice.test.js` перевіряє лише запис партії; тести позиції та UI —
  у своїх файлах (4.3, 4.4).
- `docs/layer-separation.md`: чекліст «Крок 4» і «Відкрите питання про
  `turn`» — відмічені.
- `docs/next-steps.md`: підсвітка легальних полів через `selectLegalTargets`
  (4.5).

## 5. Перевірка перед комітом

```sh
grep -rn "state\.game\.\(board\|castlingRights\|enPassantTarget\|selectedSquare\|playerSide\)" src   # порожньо
grep -rn "getState()\.game" src --include=*.test.*    # порожньо (тести через селектори)
grep -n "plyCount % 2" src/redux                       # порожньо
grep -rn "selectIsFriendlyFire\|selectIsMovePossible" src   # порожньо
npm test
npm run lint
```

Руками в браузері: нова партія за білих і за чорних (дошка перевертається),
кілька ходів, рокіровка, мат, хід після мату, здача, перезавантаження
посеред партії.

## 6. Питання на рев'ю

1. Чому `turn` — частина `position`, а `plyCount` — ні? Що з них потрапляє у
   FEN і в яке поле?
2. Навіщо `gameEvents.js`, якщо можна імпортувати `moveExecuted` з
   `gameSlice`?
3. Чому `positionSlice` не має власних `reducers`, лише `extraReducers`?
4. Чому легальні ходи — селектор, а не поле в стані? Що дає `createSelector`?
5. Що станеться з гравцем, у якого в `localStorage` партія версії 3, після
   деплою кроку 4? Чому це прийнятно?
6. Чому `preloadedState` для `ui` треба доповнювати `selectedSquare: null`?
7. Чому на 4.0 тести переводяться на селектори **до** розбиття, а не разом
   із ним?
