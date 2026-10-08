# Тестові фікстури: позиції, ходи, патерни

Дата: 2026-10-08

Висновок: виносити варто, але вибірково. У спільний модуль іде те, що повторюється у 2+ файлах: права рокіровки, обгортки `board → gameState`, стан стору та названі шахові патерни. Маленькі дошки на 2–4 фігури, які ілюструють одне правило в одному `it`, лишаються inline.

## 1. Поточний стан

У 14 тест-файлах (~2350 рядків) кожен файл сам будує свої позиції, права рокіровки та стан стору. Спільного модуля фікстур немає.

| Що дублюється | Де | Скільки копій |
| --- | --- | --- |
| `NO_CASTLING_RIGHTS` | gameStatus, legalMoves, notation, gameSlice + inline у gameOperations, useGameState | 6 |
| `FULL_CASTLING_RIGHTS` / `ALL_RIGHTS` | legalMoves, gameSlice, applyMove | 3 |
| Обгортка `board → gameState` | `makePosition` (applyMove), `baseGameState` (gameStatus), `gameStateBefore` (notation) | 3 різні назви, той самий зміст |
| `createTestStore` з повним `game`-state | gameOperations, useGameState | 2, вже розійшлися: у gameOperations немає `turnStartedAt` |
| Стан редюсера `{ board, selectedSquare, history, plyCount, ... }` | gameSlice.test — у кожному `it` | ~15 |
| Пара королів `e1: 'K' … e8: 'k'` | applyMove 29, legalMoves 13, gameStatus 7 | ~55 входжень |
| Повний об'єкт ходу `{ captured: null, castling: null, promotion: null }` | notation.test — у кожному `it` | ~10 |

Дошки як об'єкти-літерали `{ e1: 'K', e2: 'q' }` читаються добре, і самі по собі проблемою не є. Проблема в тому, що обгортки й стан дублюються і вже почали розходитися.

Окремо, у `src/data/`:
- `fenConstants.js` містить `MATE_IN_ONE_FEN` з позначкою «неточний FEN, лише для прикладу». Як тестові дані його використовувати не можна.
- `positions.js` робить `console.log` під час імпорту, тобто в кожному тесті, який імпортує `gameSlice`.

## 2. Чи має сенс

| | Виносити | Лишати inline |
| --- | --- | --- |
| Коли | Та сама сутність у 2+ файлах; стан, що має збігатися з `initialState`; патерн з власною назвою (дитячий мат, зв'язка, пат) | Дошка з 2–4 фігур, що ілюструє рівно одне правило |
| Виграш | Нове поле в `gameState` додається в одному місці; один патерн перевіряється на всіх шарах (engine → slice → operations) | Тест читається без переходів між файлами; видно, чому очікується саме цей результат |
| Ризик | «Магічні» фікстури: тест не показує дошку, яку перевіряє | Копії розходяться (вже сталося з `turnStartedAt`) |

Головний аргумент «за»: шари вже розділені (гілка refactor/layers). Ті самі позиції (рокіровка, en passant, промоція) перевіряються в applyMove, gameSlice і gameOperations, але щоразу описані по-різному.

## 3. Які сутності виносити

### 3.1 Права рокіровки (константи)

```js
export const ALL_CASTLING = Object.freeze({ whiteShort: true, whiteLong: true, blackShort: true, blackLong: true });
export const NO_CASTLING = Object.freeze({ whiteShort: false, whiteLong: false, blackShort: false, blackLong: false });
```

### 3.2 Білдери стану (функції, не константи)

- `makeGameState(board, overrides)` — стан рівня engine: `{ board, castlingRights: NO_CASTLING, enPassantTarget: null, ...overrides }`. Замінює `makePosition`, `baseGameState`, `gameStateBefore`.
  За замовчуванням `NO_CASTLING`: так рокіровка не потрапляє непомітно в списки ходів. Тести рокіровки (зокрема applyMove) передають `ALL_CASTLING` явно.
- `makeSliceState(overrides)` — стан редюсера на основі справжнього `initialState`, отриманого через `gameReducer(undefined, { type: '@@INIT' })`. Вихідний код слайсу змінювати не треба, і нові поля підхоплюються автоматично. `board` за замовчуванням `{}`.
- `createTestStore(overrides)` — один на gameOperations і useGameState, будується через `makeSliceState`.

### 3.3 Дошки та названі позиції

- `withKings(pieces)` → `{ e1: 'K', e8: 'k', ...pieces }`. Прибирає ~55 повторів пари королів там, де королі потрібні лише для легальності позиції.
- `POSITIONS` — лише патерни, що використовуються у 2+ файлах або мають шахову назву. Кожна позиція — об'єкт `{ board, castlingRights?, enPassantTarget?, turn? }` з коментарем, що в ній відбувається:

| Назва | Зміст | Де вже є схожа позиція |
| --- | --- | --- |
| `START` | Початкова позиція з `STARTING_FEN` через `fenToBoardObject` | — |
| `CASTLE_READY_WHITE` / `_BLACK` | Король і обидві тури на місцях, `ALL_CASTLING` | applyMove, gameSlice, legalMoves |
| `CASTLE_THROUGH_CHECK` | Клітинка проходу короля під боєм | legalMoves |
| `EN_PASSANT_WHITE` / `_BLACK` | Пішаки поруч, `enPassantTarget` встановлено | applyMove, gameSlice |
| `PROMOTION_WHITE` / `_BLACK` | Пішак на передостанньому ряду | applyMove, gameOperations, promotion |
| `PINNED_ROOK` | `{ e1: 'K', e2: 'R', e8: 'r' }` | legalMoves |
| `BACK_RANK_MATE`, `STALEMATE` | Мат по останньому ряду, пат | gameStatus |

FEN використовуємо лише для повних позицій (старт, позиції з партій). Для маленьких дошок об'єкт читається краще.

### 3.4 Ходи

- `MOVES` — типові ходи: `WHITE_SHORT_CASTLE = { piece: 'K', from: 'e1', to: 'g1' }`, `WHITE_LONG_CASTLE`, `BLACK_SHORT_CASTLE`, `BLACK_LONG_CASTLE`, `E2_E4`, `D7_D5`.
- `makeMove(partial)` → `{ captured: null, castling: null, promotion: null, ...partial }`. Прибирає повтор у notation.test.

### 3.5 Послідовності (партії)

- `GAMES.FOOLS_MATE = [['f2','f3'], ['e7','e5'], ['g2','g4'], ['d8','h4']]` і подібні.
- `playMoves(store, sequence)` — прогін через `attemptMove`. Дає інтеграційні тести engine → slice → operations: мат, пат, запис SAN в історію.

### Чого у фікстурах НЕ буде

Очікуваних результатів. Фікстура описує вхід, а `expect(...)` лишається в тесті. Інакше тест перевіряє фікстуру саму з собою.

## 4. Структура файлів

```
src/test/
  setup.js            (вже є)
  fixtures/
    castling.js       ALL_CASTLING, NO_CASTLING
    state.js          makeGameState, makeSliceState, createTestStore
    boards.js         withKings, POSITIONS
    moves.js          MOVES, makeMove
    games.js          GAMES, playMoves
    index.js          реекспорт
```

`src/test/**` уже виключено з coverage у `vite.config.js`, а `include` підхоплює лише `*.test.*`, тому фікстури не запускаються як тести. Імпорт у тестах: `import { makeGameState, NO_CASTLING } from '../test/fixtures';`.

## 5. Покроковий план

Кожен крок — окремий коміт. Після кожного `npm test` має бути зеленим, а кількість тестів не змінюється (крім кроку 7).

0. **Передумова.** Закомітити поточні зміни в `applyMove.test.js`, щоб міграція не змішалася з незавершеною роботою.
1. **Прибрати `src/data/`.** Видалити `console.log` з `positions.js`. Видалити `MATE_IN_ONE_FEN` або замінити на коректний FEN.
2. **Права рокіровки.** Створити `fixtures/castling.js`, замінити 9 копій у 7 файлах.
3. **`makeGameState`.** Замінити `makePosition`, `baseGameState`, `gameStateBefore`. В applyMove.test явно передати `castlingRights: ALL_CASTLING` там, де раніше спрацьовував дефолт `ALL_RIGHTS`.
4. **Стан стору.** `makeSliceState` + `createTestStore`. Мігрувати gameOperations.test і useGameState.test (заразом зникає розбіжність із `turnStartedAt`), потім літерали стану в gameSlice.test.
5. **`withKings` і `POSITIONS`.** Спершу додати лише позиції з таблиці 3.3, які вже є у 2+ файлах. Решту дошок не чіпати.
6. **`MOVES` і `makeMove`.** Мігрувати notation.test і тести рокіровки.
7. **Послідовності.** `GAMES` + `playMoves`, нові інтеграційні тести: дитячий мат → `isGameOver`, `reason: 'checkmate'`; рокіровка й en passant через повний пайплайн.
8. **Документація.** Додати в розділ тестування README правила з розділу 6 і посилання на цей документ.

## 6. Правила та ризики

**Правила**
- Фікстура переїжджає в спільний модуль, коли з'являється в другому файлі. До того вона живе в тесті.
- Константи заморожені (`Object.freeze`, для вкладених об'єктів — глибоко), а білдери щоразу повертають новий об'єкт. Тест не може зіпсувати фікстуру для інших тестів.
- Назва позиції описує патерн (`PINNED_ROOK`), а не тест, у якому її вперше використали.
- Біля кожної позиції — коментар на 1 рядок: що на дошці і чия черга.
- Фікстури не містять очікуваних результатів (див. 3.5).

**Ризики**
- *Магічні фікстури.* Якщо тест перевіряє конкретні клітинки, дошку краще лишити inline або розгорнути через `withKings({...})`.
- *Зміна дефолту рокіровки в applyMove.test.* Зараз там дефолт `ALL_RIGHTS`, а в спільному білдері буде `NO_CASTLING`. Тести `nextCastlingRights` і рокіровки треба перевірити поштучно (крок 3).
- *`makeSliceState` залежить від `initialState`.* Якщо початковий стан зміниться, зміняться й усі тести стору. Це очікувана поведінка, але `board` у білдері завжди перевизначається на `{}`, щоб тести не залежали від стартової розстановки.
