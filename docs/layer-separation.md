# Розділення шарів: UI / Redux / рушій

Дата: 2026-10-02. Формат: таска від ментора + покроковий план виконання.

## 1. Контекст

Зараз у `gameSlice.js` змішано три різні світи: шахові правила, запис партії
та стан інтерфейсу. Читаючи редюсер `moveExecuted`, неможливо швидко
відповісти "де тут шахи, а де Redux".

Що конкретно не так:

- **Логіка рушія живе в редюсері.** Хелпери `nextCastlingRights`,
  `nextEnPassantTarget`, `getCastlingRookMove` (`gameSlice.js:27-81`) і
  застосування ходу — взяття на проході, промоція, переміщення тури
  (`gameSlice.js:104-145`) — це чисті шахи, але їх неможливо викликати без Redux.
- **Зріз позиції збирається вручну тричі:** `gameSlice.js:98-102`,
  `gameSlice.js:152-156`, `gameOperations.js:56`. Рушій завжди хоче
  `{ board, castlingRights, enPassantTarget }`, але такої сутності в стані немає.
- **Залежність перевернута.** `src/engine/attacks.js`, `legalMoves.js`,
  `promotion.js`, `pseudoMoves.js` імпортують `COLORS` з
  `redux/game/gameConstants`. Рушій знає про Redux, хоча має бути навпаки.
- **UI ходить у рушій напряму:** `src/hooks/useGameState.js:8` імпортує
  `engine/promotion`.
- **Стан браузера лежить разом зі станом партії:** `selectedSquare` і
  `playerSide` — це про екран, а не про шахи.
- **Фасад рушія порожній:** `src/engine/index.js` — заглушки, тому
  `attemptMove` імпортує внутрішні модулі рушія напряму.

## 2. Таска

**Розділи код на три шари — рушій, Redux, UI — так, щоб рушій не знав про
Redux, а редюсери не містили шахових правил.** Поведінка гри для користувача
не змінюється ні на піксель: це чистий рефакторинг.

Обмеження:

- Працюєш на окремій гілці від `dev`, наприклад `refactor/layers`.
- Один крок з плану — один коміт. Після кожного коміту `npm test` зелений, а
  гра в браузері працює.
- Не додавай нових фіч і не виправляй "заодно" чужі баги. Знайшов — запиши в
  `docs/next-steps.md`.
- Існуючі тести можна переносити та переписувати під нову форму стану, але
  не видаляти їх без заміни.

Критерії приймання:

1. `grep -rE "redux|react" src/engine` не знаходить жодного імпорту.
2. У `src/redux/**/*Slice.js` немає шахової логіки (`castling`, `enPassant`,
   `promotion` як обчислення) — лише присвоєння готових значень.
3. Компоненти та хуки не імпортують нічого з `src/engine` напряму.
4. ESLint падає, якщо хтось порушить пункти 1 і 3.
5. Рушій має власні юніт-тести на `applyMove`, що запускаються без store.
6. Збережена стара партія з localStorage не ламає застосунок (піднятий
   `SCHEMA_VERSION`).

## 3. Цільова архітектура

Патерни, на які спираємось:

- **Functional core, imperative shell** (він же Ports & Adapters /
  гексагональна архітектура): рушій — чисте ядро `(position, move) → result`,
  без React, Redux і `Date.now()`. Redux і браузер — оболонка: зберігають
  стан, рахують час, пишуть у localStorage, малюють.
- **Залежності йдуть в один бік:** `UI → Redux → engine`. Рушій не імпортує
  нічого з рівнів вище.
- **Товстий thunk, тонкі редюсери; actions як події.** `attemptMove`
  викликає рушій і диспатчить одну подію `moveExecuted(result)`. Кожен слайс
  реагує на неї через `extraReducers` і просто записує свою частину.
- **Слайси за доменами**, а не одна велика `game`.

```
┌──────────────────────────────────────────────────────────────┐
│ UI: src/components, src/hooks, src/pages                     │
│   лише useSelector(selectX) і dispatch(thunk/action)         │
└───────────────────────────────┬──────────────────────────────┘
                                │ селектори, thunk-и
┌───────────────────────────────▼──────────────────────────────┐
│ Redux: src/redux                                             │
│   position/  board, castlingRights, enPassantTarget          │
│   game/      history, годинники, результат, gameId           │
│   ui/        selectedSquare, playerSide                      │
│   game/gameOperations.js  attemptMove → engine → dispatch    │
└───────────────────────────────┬──────────────────────────────┘
                                │ лише через engine/index.js
┌───────────────────────────────▼──────────────────────────────┐
│ Рушій: src/engine — чисті функції, нічого не імпортує вгору  │
│   getLegalMoves(position, from)                              │
│   applyMove(position, move) → { position, details }          │
│   getStatus(position, color) → { isCheck, isCheckmate, ... } │
│   toSan(positionBefore, move, status)                        │
└──────────────────────────────────────────────────────────────┘
```

Куди переїжджають поточні поля `gameSlice`:

| Поле / код | Куди |
|---|---|
| `board`, `castlingRights`, `enPassantTarget` | слайс `position` |
| `history`, `plyCount`, `whiteTime`, `blackTime`, `turnStartedAt` | слайс `game` |
| `winner`, `reason`, `isGameOver`, `gameId` | слайс `game` |
| `selectedSquare`, `playerSide` | слайс `ui` |
| хелпери `gameSlice.js:27-81`, логіка `gameSlice.js:104-145` | `engine/applyMove.js` |
| перевірки ходу `gameOperations.js:56-84` | `engine.getLegalMoves` |
| `selectIsFriendlyFire`, `selectIsMovePossible` | мемоізований `selectLegalTargets` |

## 4. Крок 1. Розвернути залежність констант

**Мета: рушій не імпортує нічого з `src/redux`.** Це найменший крок і
фундамент для решти.

1. Створи `src/engine/constants.js` і перенеси туди `COLORS`. Шахові
   константи (кольори, пізніше — типи фігур) належать рушію.
2. У `src/redux/game/gameConstants.js` залиш `DEFAULT_TIME`, `TIME_CONTROLS`,
   `SIDE_OPTIONS`, `LOW_TIME_THRESHOLD_MS` і додай
   `export { COLORS } from '../../engine/constants';`, щоб не ламати існуючі
   імпорти в UI.
3. Виправ імпорти в `attacks.js`, `legalMoves.js`, `promotion.js`,
   `pseudoMoves.js` на `./constants`.
4. Перевір `src/utils/chessHelpers.js` і `boardUtils.js`: якщо їх
   використовує лише рушій і Redux, вони теж можуть переїхати в
   `src/engine/`. Рішення запиши в опис коміту.

Готово, коли: `grep -rn "redux" src/engine` порожній, тести зелені.

Підказка ментора: ре-експорт — не милиця, а свідоме рішення. UI бачить лише
шар Redux, тож отримує `COLORS` через нього (крок 5).

## 5. Крок 2. `engine/applyMove` — винести логіку ходу з редюсера

**Мета: чиста функція, яка за позицією і ходом повертає нову позицію та
деталі ходу.** Форма стану Redux на цьому кроці не змінюється.

Контракт:

```js
/**
 * @param {{ board, castlingRights, enPassantTarget }} position
 * @param {{ from, to, piece, promotion? }} move
 * @returns {{
 *   position: { board, castlingRights, enPassantTarget }, // НОВИЙ об'єкт
 *   details:  { captured, castling, enPassant, promotion }
 * }}
 */
export function applyMove(position, move)
```

1. Створи `src/engine/applyMove.js`.
2. Перенеси туди `ROOK_HOME_SQUARE_RIGHT`, `nextCastlingRights`,
   `nextEnPassantTarget`, `CASTLING_ROOK_MOVES`, `getCastlingRookMove` з
   `gameSlice.js:27-81`.
3. Перенеси тіло `gameSlice.js:104-145` (взяття, взяття на проході, промоція,
   рокіровка). **Важливо:** у редюсері Immer дозволяв
   `delete state.board[from]`. У рушії Immer немає, тому почни з
   `const board = { ...position.board }` і мутуй лише копію.
4. Реалізуй через `applyMove` заглушку `getMoveDetails` у
   `src/engine/index.js:31` або заміни її на експорт `applyMove`. Фасад —
   єдині двері в рушій.
5. У `moveExecuted` залиш один виклик:
   `const { position, details } = applyMove(before, action.payload)`, далі
   присвой `state.board`, `state.castlingRights`, `state.enPassantTarget` з
   результату.
6. Напиши `src/engine/applyMove.test.js`. Мінімум: звичайний хід, взяття,
   взяття на проході, коротка і довга рокіровка, промоція з фігурою і без,
   втрата права рокіровки при взятті тури на a1/h8, і тест, що вхідна
   `position` не змінилась.

Готово, коли: у `gameSlice.js` немає жодної функції поза `createSlice`, старі
тести слайса зелені без змін.

Підказка ментора: поки тести слайса не змінювались і зелені — ти довів, що
перенесення нічого не зламало. Саме тому форму стану міняємо пізніше, окремим
кроком.

## 6. Крок 3. Товстий thunk, тонкий редюсер

**Мета: `attemptMove` рахує все через рушій, а `moveExecuted` лише записує
готовий результат.** Після цього редюсер не імпортує нічого з `src/engine`.

Нова форма payload — це подія "хід відбувся" з усім, що потрібно слайсам:

```js
moveExecuted({
  move: { from, to, piece },
  position,            // нова позиція від applyMove
  details,             // captured, castling, enPassant, promotion
  isCheck, isCheckmate,
  san,
  timestamp: Date.now(),
  analysis,            // true — хід після завершення партії
})
```

1. Додай у фасад `src/engine/index.js` функції, яких бракує thunk-у:
   `getLegalMoves(position, from)` (об'єднує псевдолегальні ходи, рокіровку
   і фільтр безпеки короля з `gameOperations.js:56-84`),
   `getStatus(position, color)`, `toSan(...)`.
2. Перепиши `attemptMove`: валідація → `applyMove` → статус суперника → SAN →
   один `dispatch(moveExecuted(...))`. Імпорти рушія — лише з `../../engine`,
   не з внутрішніх модулів.
3. Виріши, що робити з аналізом після кінця партії (`gameOperations.js`,
   гілка `isGameOver`). Зараз там валідації немає, але редюсер все одно
   застосовує хід — тепер це має робити та ж гілка thunk-а.
4. `Date.now()` переноситься з редюсера в payload. Редюсер має бути чистим:
   однаковий action — однаковий стан. Те саме для `endGame` — або через
   `prepare`-колбек у `createSlice`.
5. Редюсер `moveExecuted` тепер лише: присвоїти позицію, зменшити годинник,
   додати запис в `history`, `plyCount += 1`, скинути вибір.
6. Перенеси тести "редюсер правильно рокірує" з `gameSlice.test.js` у тести
   рушія або `gameOperations.test.js`. Тести слайса перевіряють лише запис
   даних.

Готово, коли: `gameSlice.js` не імпортує `src/engine`, `attemptMove`
імпортує рушій лише з `engine/index.js`.

Підказка ментора: офіційний Redux Style Guide радить тримати логіку в
редюсерах. Ми свідомо робимо навпаки, бо тут "логіка" — це домен (шахи) з
власним модулем. Редюсер все одно вирішує, як зберігати дані, просто не
думає про правила. Будь готовий пояснити це рішення на рев'ю.

## 7. Крок 4. Розбити стан на слайси `position`, `game`, `ui`

**Мета: кожен слайс відповідає за один вид даних, і це видно з назви
файлу.** Саме цей крок дає візуальний поділ, з якого все почалось.

1. **Події — окремо від слайсів.** Створи `src/redux/game/gameEvents.js` і
   оголоси там `moveExecuted`, `newGameStarted`, `endGame` через
   `createAction('game/moveExecuted')` тощо. Типи лишаються ті самі, тож
   `PERSIST_ON` у `store.js` не зламається. Без цього слайси імпортуватимуть
   один одного і виникне цикл.
2. **`src/redux/position/positionSlice.js`** — `board`, `castlingRights`,
   `enPassantTarget`. Власних редюсерів немає, лише `extraReducers`:
   `moveExecuted` → `return action.payload.position`, `newGameStarted` →
   початкова позиція.
3. **`src/redux/ui/uiSlice.js`** — `selectedSquare`, `playerSide`. Власний
   редюсер `setSelection`; на `moveExecuted` скидає вибір, на
   `newGameStarted` бере `side`.
4. **`gameSlice.js`** — запис партії: `history`, `plyCount`, годинники,
   `turnStartedAt`, `winner`, `reason`, `isGameOver`, `gameId`.
5. **Селектори.** Поклади поруч із кожним слайсом (`positionSelectors.js`,
   `uiSelectors.js`). Назви селекторів залишаються, змінюється лише шлях
   (`state.position.board`). Додай `selectPosition`, щоб thunk брав позицію
   одним рядком.
6. **Валідаційні селектори** (`selectIsFriendlyFire`, `selectIsMovePossible`,
   `gameSelectors.js:72-100`) не стають станом. Заміни їх одним мемоізованим
   `selectLegalTargets`, який викликає
   `engine.getLegalMoves(position, selectedSquare)`. Легальні ходи — це
   похідні дані, їх не зберігають.
7. **Store і persist.** У `store.js` — три редюсери. `persistenceMiddleware`
   зберігає `{ position, game, ui: { playerSide } }` (вибір клітинки
   зберігати не треба). Підніми `SCHEMA_VERSION` до 3 у `persistGame.js`:
   старі збереження просто ігноруються.

Готово, коли: `state.game` не містить ні `board`, ні `selectedSquare`.
Партія відновлюється після перезавантаження сторінки.

Підказка ментора: чому не "слайс валідації"? Валідація — це функція, а
станом є лише її вхідні дані. У шахах ця сутність називається позицією —
саме її описує FEN.

**Відкрите питання для тебе:** чия черга ходу — це частина `position` (як
у FEN, поле `turn`) чи похідне від `plyCount` у `game` (як зараз)? Перший
варіант дає рушію повну позицію без зовнішніх параметрів, другий — не
дублює дані. Обери й обґрунтуй в описі коміту.

## 8. Крок 5. UI — лише через селектори, межі стереже ESLint

**Мета: правило залежностей перевіряє машина, а не пам'ять.** Без цього
через місяць хтось (можливо, ти) знову імпортує рушій у компонент.

1. `src/hooks/useGameState.js:8` імпортує `requiresPromotion` з рушія.
   Заміни на селектор у шарі Redux (наприклад,
   `selectNeedsPromotionChoice(state, from, to)`), який сам питає рушій.
2. `useGameState.js:19` читає `state.game.turnStartedAt` в обхід селекторів —
   додай `selectTurnStartedAt`.
3. `COLORS` для UI береться з `redux/game/gameConstants` (ре-експорт з
   кроку 1). Це свідоме рішення: UI бачить лише шар Redux.
4. Додай у `.eslintrc.cjs` два `overrides`:

   ```js
   overrides: [
     {
       // Рушій не знає ні про Redux, ні про React
       files: ['src/engine/**'],
       rules: {
         'no-restricted-imports': ['error', {
           patterns: ['**/redux/**', 'react', 'react-*', '@reduxjs/*'],
         }],
       },
     },
     {
       // UI ходить у рушій лише через Redux
       files: ['src/components/**', 'src/hooks/**', 'src/pages/**', 'src/layouts/**'],
       rules: {
         'no-restricted-imports': ['error', {
           patterns: ['**/engine', '**/engine/**'],
         }],
       },
     },
   ],
   ```

5. Перевір правило навмисно: додай тимчасовий імпорт рушія в будь-який
   компонент і переконайся, що `npm run lint` падає. Потім видали.
6. Онови `docs/move-validation.md` (розділ про фасад) і `docs/next-steps.md`:
   пункт "Фасад `engine/index.js`" тепер закритий.

Готово, коли: `npm run lint` і `npm test` зелені, а тимчасове порушення з
пункту 5 лінтер ловить.

## 9. Чекліст здачі

- [ ] Крок 1: `COLORS` у `src/engine/constants.js`, рушій не імпортує `redux`
- [ ] Крок 2: `engine/applyMove.js` + тести, редюсер викликає його
- [ ] Крок 3: `attemptMove` рахує все, `moveExecuted` лише записує, `Date.now()` у payload
- [ ] Крок 4: слайси `position` / `game` / `ui`, `gameEvents.js`, `SCHEMA_VERSION = 3`
- [ ] Крок 5: UI без імпортів рушія, ESLint `overrides` працюють
- [ ] Кожен крок — окремий коміт, тести зелені після кожного
- [ ] Відкрите питання про `turn` вирішене й обґрунтоване
- [ ] `docs/next-steps.md` і `docs/move-validation.md` оновлені

Питання для самоперевірки (відповідай усно на рев'ю):

1. Чому `applyMove` повертає новий об'єкт, а не змінює вхідний?
2. Чому `Date.now()` не можна викликати в редюсері, а в thunk-у можна?
3. Навіщо `gameEvents.js`, якщо можна імпортувати `moveExecuted` з `gameSlice`?
4. Чому легальні ходи — селектор, а не поле в стані?
5. Що станеться з гравцем, у якого в localStorage збережена партія у форматі
   версії 2, після деплою кроку 4?
6. Яку помилку зловить ESLint, якщо в `Square.jsx` написати
   `import { getLegalMoves } from '../../engine'`?
