# Архітектура ChessB

Як влаштовано те, що вже працює. Стан коду: гілка `refactor/layers`,
2026-11-10. Що ще треба зробити — `docs/roadmap.md`. Обґрунтування й історія
рішень — `docs/archive/` (посилання в тексті).

## 1. Шари

```
┌────────────────────────────────────────────────────────────┐
│ UI: src/components, src/hooks, src/pages, src/layouts      │
│   useSelector(selectX), dispatch(thunk | event | command)  │
└──────────────────────────────┬─────────────────────────────┘
                               │ селектори, thunk-и, події
┌──────────────────────────────▼─────────────────────────────┐
│ Redux: src/redux                                           │
│   position/  game/  ui/   — слайси за доменами             │
│   game/gameEvents.js      — події, на які реагують слайси  │
│   game/gameOperations.js  — thunk-и: рахують через рушій   │
│   store.js + persistGame.js — store і localStorage         │
└──────────────────────────────┬─────────────────────────────┘
                               │ лише через src/engine/index.js
┌──────────────────────────────▼─────────────────────────────┐
│ Рушій: src/engine — чисті функції, без React/Redux/Date    │
└────────────────────────────────────────────────────────────┘
```

Правила:

- **Залежності йдуть лише вниз.** Рушій не імпортує нічого з `src/redux`,
  React чи браузерних API (`grep -rE "redux|react" src/engine` порожній).
- **Redux ходить у рушій лише через фасад** `src/engine/index.js`
  (`grep -rn "engine/" src/redux` порожній). Внутрішні модулі рушія фасад не
  імпортують — інакше цикл.
- **Товстий thunk, тонкі редюсери.** Шахові правила, SAN і `Date.now()`
  рахує thunk; редюсер лише записує готовий payload. Той самий action завжди
  дає той самий стан.
- **Слайси не імпортують один одного.** Спільні події живуть в окремому
  модулі `gameEvents.js`. Селектори можуть читати кілька слайсів.

Відомі винятки (закриваються в `roadmap.md`, R4): UI ще імпортує рушій
напряму — `ChessBoardContainer.jsx` і `useGameState.js` (`getPieceColor`,
`requiresPromotion`). ESLint межі шарів поки не перевіряє.

Рішення, чому так, а не «логіка в редюсерах» за Redux Style Guide:
`archive/layer-separation.md`, крок 3.

## 2. Рушій (`src/engine`)

Власний рушій без `chess.js` (`archive/move-notation.md`, розділ 4;
`archive/move-validation.md`). Дошка — об'єкт `{ e1: 'K', e8: 'k' }`,
фігури — FEN-символи (великі — білі), колір — `'w' | 'b'`.

### 2.1. Позиція

```js
position = {
  board, // { [square]: 'K' | 'q' | ... }
  turn, // 'w' | 'b' — хто ходить
  castlingRights, // { whiteShort, whiteLong, blackShort, blackLong }
  enPassantTarget, // 'e3' | null
};
```

Це рівно поля 1–4 FEN. Лічильники (поля 5–6) — не позиція: номер ходу
живе в записі партії (`plyCount`), правила 50 ходів ще немає.

### 2.2. Публічний API (фасад)

| Функція                                                    | Повертає                                | Примітка                                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `getLegalMoves(position, from)`                            | `string[]` цільових клітинок            | геометрія + безпека короля + рокіровка; колір — з фігури, черги не знає; порожня клітинка → `[]`; порядок не гарантований |
| `isMoveLegal(position, from, to)`                          | `boolean`                               | `getLegalMoves(...).includes(to)`                                                                                         |
| `applyMove(position, move)`                                | `{ position, details }`                 | **новий** об'єкт, вхід не змінюється; `turn` — суперник того, хто ходив (колір з фігури)                                  |
| `getStatus(position, color)`                               | `{ isCheck, isCheckmate, isStalemate }` | легальні ходи рахуються один раз                                                                                          |
| `toSan(positionBefore, move, status)`                      | `'Nbd2+'`                               | `buildSan`; `status` — суперника **після** ходу                                                                           |
| `getPieceColor`, `getOpponentColor`                        | колір                                   |                                                                                                                           |
| `requiresPromotion(piece, to)`, `isValidPromotionPiece(p)` | `boolean`                               |                                                                                                                           |
| `COLORS`                                                   | `{ WHITE: 'w', BLACK: 'b' }`            | Redux ре-експортує для UI через `gameConstants.js`                                                                        |

`move = { from, to, piece, promotion? }`. Без `promotion` пішак на
останньому ряду стає ферзем.

`details = { captured, castling: 'K' | 'Q' | null, enPassant, promotion }`.

### 2.3. Модулі

| Файл                                               | Що робить                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pieceGeometry.js`                                 | зміщення коня/короля, напрямки тури/слона/ферзя                                        |
| `pseudoMoves.js`                                   | псевдолегальні ходи фігури (без своїх фігур на цілі, з en passant)                     |
| `attacks.js`                                       | `isSquareAttacked(board, square, byColor)`                                             |
| `legalMoves.js`                                    | `filterByKingSafety`, `getCastlingMoves`, `getLegalMoves`                              |
| `gameStatus.js`                                    | `isCheck`, `getAllLegalMoves`, `getStatus`                                             |
| `applyMove.js`                                     | застосування ходу, `nextCastlingRights`, `nextEnPassantTarget`, хід тури при рокіровці |
| `notation.js`                                      | SAN зі строгою дизамбігуацією (через легальні ходи), `+`/`#`, `=Q`, `O-O`/`O-O-O`      |
| `promotion.js`                                     | промоція: перевірка, дефолт-ферзь                                                      |
| `boardUtils.js`, `chessHelpers.js`, `constants.js` | нотація ↔ координати, колір фігури, `COLORS`                                          |

Тонкі місця:

- Рокіровка **не** проходить через `filterByKingSafety`:
  `getCastlingMoves` сам перевіряє шах, прохід і ціль короля.
- Права рокіровки зникають і при ході короля/тури, і при **взятті** тури на
  її стартовій клітинці.
- Bitboards та інші оптимізації свідомо не робились: для гри людини
  швидкості досить (`archive/move-validation.md`, розділ 3.1).

## 3. Redux (`src/redux`)

### 3.1. Стан

| Слайс      | Поля                                                                                                         | Хто змінює                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `position` | `board`, `turn`, `castlingRights`, `enPassantTarget`                                                         | лише події: `moveExecuted` → `payload.position` цілком; `newGameStarted` → стартова позиція. Власних `reducers` немає |
| `game`     | `history`, `plyCount`, `whiteTime`, `blackTime`, `turnStartedAt`, `winner`, `reason`, `isGameOver`, `gameId` | події `moveExecuted`, `newGameStarted`, `endGame`                                                                     |
| `ui`       | `selectedSquare`, `playerSide`                                                                               | команда `setSelection`; на `moveExecuted` вибір знімається, на `newGameStarted` — вибір знято, `playerSide` з payload |

`turn` (хто ходить у позиції) і `plyCount` (скільки ходів у записі) —
різні величини: у режимі аналізу білі можуть піти двічі поспіль.
Рішення: `layer-separation-step4.md`, розділ 3.

`gameId` зростає з кожною партією; UI використовує його як React `key`, щоб
перемонтувати годинники.

### 3.2. Події та команди

| Action           | Тип                   | Payload                                                                                                               |
| ---------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `moveExecuted`   | `game/moveExecuted`   | `{ move, color, position, details, isCheck, isCheckmate, san, timestamp, analysis? }`                                 |
| `newGameStarted` | `game/newGameStarted` | `{ time, side }` (`side` уже розв'язаний з `random`)                                                                  |
| `endGame`        | `game/endGame`        | `{ winner: 'w' \| 'b' \| 'draw', reason, timedOutColor?, timestamp }` — `timestamp` додає `prepare`, якщо не передано |
| `setSelection`   | `ui/setSelection`     | клітинка або `null`                                                                                                   |

Події оголошені в `game/gameEvents.js` через `createAction`. Типи `game/...`
не змінюються: на них зав'язаний persist.

`reason`: `checkmate`, `stalemate`, `timeout`, `resignation`,
`draw-agreement`.

### 3.3. Thunk-и (`game/gameOperations.js`)

**`attemptMove({ from, to, piece, promotion? })`**:

1. Партія завершена → **режим аналізу**: хід застосовується без перевірок,
   `analysis: true`, `endGame` не диспатчиться.
2. Час активного гравця вичерпано → `timeExpired`.
3. Хід не за чергою, `from === to`, нелегальний хід, недійсна фігура
   промоції → нічого не диспатчиться.
4. `buildMovePayload`: `applyMove` → `getStatus` суперника → `toSan` →
   `timestamp = Date.now()` → один `dispatch(moveExecuted(payload))`.
5. Мат → `endGame({ winner: turn, reason: 'checkmate' })`; пат → нічия.
   Стан після диспатчу не перечитується: статус уже пораховано.

**`timeExpired(color)`** — ще раз перевіряє залишок живим селектором
(захист від гонки), потім `endGame` з `reason: 'timeout'`.
**`resignGame()`** — здається `playerSide`, незалежно від черги.
**`offerDraw()`** — нічия за згодою (підтвердження — `window.confirm` в UI).

### 3.4. Запис ходу в `history`

```js
{
  from, to, piece, promotion,          // з move; promotion перекрито з details
  captured, castling, enPassant,       // details від applyMove
  isCheck, isCheckmate, san,
  timestamp,                           // мить ходу
  moveTimeMs,                          // скільки думав
  clockAfter: { w, b },                // залишок обох годинників після ходу
  analysis?,                           // лише true, лише для ходів після кінця партії
}
```

`selectMovePairs` (мемоізований) групує напівходи в пари для `MoveList`.

### 3.5. Селектори

| Файл                            | Що                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `position/positionSelectors.js` | `selectPosition` (без `createSelector`: `state.position` уже стабільний референс), `selectBoard`, `selectCurrentTurn` та дрібні селектори клітинок |
| `game/gameSelectors.js`         | годинники, `selectClockRemaining`, `selectMovePairs`, результат партії                                                                             |
| `ui/uiSelectors.js`             | `selectSelectedSquare`, `selectPlayerSide`                                                                                                         |

## 4. Годинник

Годинник не тікає через Redux. Модель — **якір + похідний селектор**
(`archive/clock-and-game-record.md`):

- У стані — залишок на початок ходу (`whiteTime`/`blackTime`) і
  `turnStartedAt` (мить, коли почав іти годинник активної сторони; `null` —
  годинники стоять: до першого ходу і після кінця партії).
- `selectClockRemaining(state, color)` рахує живий залишок:
  `stored - (Date.now() - turnStartedAt)` для активної сторони, якщо партія
  йде і перший хід зроблено.
- `Clock.jsx` лише перерендерюється за таймером; нижче
  `LOW_TIME_THRESHOLD_MS` (10 с) показує десяті частки й тікає частіше.
- Нуль бачить `useGameState`, і він диспатчить `timeExpired`.
- На `moveExecuted` редюсер списує `timestamp - turnStartedAt` з того, хто
  ходив, і ставить новий якір.
- **Без паузи** при закритій вкладці чи перезавантаженні — як на
  Lichess/Chess.com. Якщо час вийшов, поки застосунок був закритий, партія
  завершиться таймаутом на першому рендері.

## 5. Збереження (`persistGame.js`, `store.js`)

- Ключ `chessb:v1:game`, формат `{ version, savedAt, state }`.
- Пишеться лише на `moveExecuted`, `endGame`, `newGameStarted`
  (`persistenceMiddleware`), а не на кожен dispatch.
- Зберігається `{ position, game, ui: { playerSide } }`. `selectedSquare`
  не зберігається.
- При старті `loadPersistedGame()` → `preloadedState`. `ui` доповнюється
  `selectedSquare: null`: `preloadedState` замінює `initialState` слайсу, а
  не зливається з ним.
- Версія не збіглась, битий JSON або помилка доступу → нова партія.
  Міграцій немає свідомо: стара партія просто не відновлюється.

| `SCHEMA_VERSION` | Зміна                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| 2                | `clockAfter`, `timestamp`, `moveTimeMs` у `history`                           |
| 3                | `castlingRights`: `wK/wQ/bK/bQ` → `whiteShort/whiteLong/blackShort/blackLong` |
| 4                | `turn` у стані                                                                |
| 5                | `{ game, ui: { playerSide } }`                                                |
| 6 (поточна)      | `{ position, game, ui: { playerSide } }`                                      |

Правило: будь-яка зміна форми збереженого стану піднімає версію (наступна
вільна — 7) і додає рядок у коментар над `SCHEMA_VERSION`.

## 6. UI

- `HomePage` — адаптивний макет (дошка, годинники поруч, панель, список ходів).
- `ChessBoardContainer` / `ChessBoardView` / `Square` / `Piece` — дошка,
  розворот за `playerSide`, підсвітка вибраної клітинки.
- `useGameState` — клік по клітинці: вибір своєї фігури → перевибір →
  `PromotionModal` для промоції → `attemptMove`. Поки модалка відкрита,
  дошка заблокована.
- `NewGameModal` (контроль часу, сторона, випадкова сторона),
  `PromotionModal`, `GameOverModal` («New game» / «View board» — перегляд
  дошки, далі можна ходити в режимі аналізу).
- `GameInfoPanel` — годинники, індикатор черги, «здатися», «нічия».
- Мова інтерфейсу — англійська; коментарі й документи — українською.

## 7. Тести

Vitest + jsdom + Testing Library; тести лежать поруч із кодом. Як
запускати — кореневий `README.md`.

| Шар   | Файли                                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Рушій | `applyMove`, `attacks`, `boardUtils`, `gameStatus`, `legalMoves`, `notation`, `pieceGeometry`, `promotion`, `pseudoMoves`, `index` (контракт фасаду) |
| Redux | `gameEvents`, `gameOperations` (thunk-и через справжній store), `gameSelectors`, `gameSlice`, `positionSlice`, `uiSlice`, `persistGame`, `store`     |
| UI    | `useGameState`, `Clock`, `GameOverModal`                                                                                                             |

Розподіл перевірок: шахові правила — у тестах рушія; «хід дійшов до стану»
— через `attemptMove`; тести слайсів перевіряють лише запис payload
(`makeMovePayload`, без рушія).

### 7.1. Фікстури (`src/test/fixtures/`)

| Файл          | Що                                                                                                                      | Імпорт                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `castling.js` | `ALL_CASTLING`, `NO_CASTLING` (заморожені)                                                                              | `../test/fixtures`                    |
| `state.js`    | `makeGameState(board, overrides)` — позиція для рушія, дефолт `ALL_CASTLING`, `turn: 'w'`; `makeMovePayload(overrides)` | `../test/fixtures`                    |
| `store.js`    | `makeSliceState`, `makePositionState`, `createTestStore({ position, game })`                                            | **напряму** `.../test/fixtures/store` |

- `store.js` не ре-експортується з `index.js`: інакше кожен тест рушія
  тягнув би Redux.
- Стани будуються зі справжнього `initialState` редюсера, тож нові поля
  підхоплюються самі.
- `createTestStore` кидає помилку на пласкі ключі (`{ board }` замість
  `{ position: { board } }`). `ui` не передзавантажується — вибір через
  `dispatch(setSelection(...))`.
- `makeGameState` дає `ALL_CASTLING`: тест, що перевіряє точний список чи
  кількість ходів короля/тури, передає `NO_CASTLING` явно.
- Фікстури не містять очікуваних результатів. Маленькі дошки (2–4 фігури)
  лишаються inline в `it`.

Формати, ухвалені на майбутнє: маленькі позиції — об'єкти, повні — FEN,
партії — UCI (`archive/test-fixtures.md`, розділ 3.6).

## 8. Ключові рішення

| Рішення                                                                  | Де обґрунтовано                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Власний рушій замість `chess.js`                                         | `archive/move-notation.md` §4, `archive/move-validation.md`        |
| Три шари, functional core / imperative shell                             | `archive/layer-separation.md`                                      |
| Thunk рахує, редюсер записує; `Date.now()` у thunk/`prepare`             | `archive/layer-separation-step3.md`                                |
| `turn` — частина позиції                                                 | `layer-separation-step4.md` §3                                     |
| Події окремо від слайсів (`gameEvents.js`)                               | `layer-separation-step4.md` §4.2                                   |
| Годинник на якорі `turnStartedAt`, без паузи                             | `archive/clock-and-game-record.md` §4, §6.1                        |
| Власний `persistGame.js` з версією замість `redux-persist`, без міграцій | `archive/clock-and-game-record.md`, `archive/next-steps.md` крок 1 |
| Спільні фікстури вибірково, `store.js` окремо                            | `archive/test-fixtures.md`                                         |
