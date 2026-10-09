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

- `makeGameState(board, overrides)` — стан рівня engine: `{ board, castlingRights: { ...ALL_CASTLING }, enPassantTarget: null, ...overrides }`. Замінює `makePosition`, `baseGameState`, `gameStateBefore`.
  За замовчуванням `ALL_CASTLING`, як на початку партії і як було в applyMove.test, де тестів рокіровки найбільше: їхній вхід не змінився. Ціна рішення: у позиції з королем на e1/e8 і турою на кутовій клітинці рокіровка потрапляє в списки ходів. Тест, що рахує ходи або перевіряє точний список, передає `NO_CASTLING` (або `{ ...NO_CASTLING, whiteShort: true }`) явно.
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

Формат зберігання позицій описано в 3.6.

### 3.4 Ходи

- `MOVES` — типові ходи: `WHITE_SHORT_CASTLE = { piece: 'K', from: 'e1', to: 'g1' }`, `WHITE_LONG_CASTLE`, `BLACK_SHORT_CASTLE`, `BLACK_LONG_CASTLE`, `E2_E4`, `D7_D5`.
- `makeMove(partial)` → `{ captured: null, castling: null, promotion: null, ...partial }`. Прибирає повтор у notation.test.

### 3.5 Послідовності (партії)

- `GAMES.FOOLS_MATE = ['f2f3', 'e7e5', 'g2g4', 'd8h4']` і подібні, у форматі UCI (див. 3.6).
- `playMoves(store, sequence)` — прогін через `attemptMove`. Дає інтеграційні тести engine → slice → operations: мат, пат, запис SAN в історію.

### 3.6 Формат зберігання

Формат обирається за розміром позиції, а не один на все.

| Що зберігаємо | Формат | Приклад |
| --- | --- | --- |
| Маленькі позиції (2–8 фігур): зв'язка, en passant, промоція, мат по останньому ряду | Об'єкт дошки + поля позиції | `{ board: withKings({ e2: 'R', e8: 'r' }), castlingRights: NO_CASTLING }` |
| Повні позиції: старт, Kiwipete, позиції з реальних партій, perft | FEN-рядок | `'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'` |
| Окремі ходи | Об'єкт | `{ piece: 'K', from: 'e1', to: 'g1' }` |
| Послідовності (партії) | UCI-рядки | `['f2f3', 'e7e5', 'g2g4', 'd8h4']`, промоція — `'a7a8n'` |

**Маленькі позиції — об'єктами.**
- `{ e1: 'K', e2: 'q' }` у FEN — це `8/8/8/8/8/8/4q3/4K3 w - - 0 1`. Щоб знайти фігуру, треба рахувати клітинки, а помилку на одну клітинку важко помітити на рев'ю.
- Рушій приймає саме об'єкт дошки, тож конвертація зайва.
- Об'єкти комбінуються: `withKings(...)`, `{ ...POSITIONS.EN_PASSANT_WHITE, enPassantTarget: null }`. FEN-рядок так не змінити.

**Повні позиції — у FEN.** Старт як об'єкт — це 32 записи. Еталонні позиції для perft публікуються у FEN і копіюються з джерела як є, без ручного перенабору.

**Партії — в UCI, не в SAN.** Розбір SAN (`Nf3`) потребує рушія, і тест нотації перевіряв би нотацію нею ж самою. UCI (`g1f3`) — це «звідки-куди», розбирається одним рядком, і промоція в нього вміщується.

**Залежність від FEN-парсера.** `src/utils/fenConverter.js` розбирає лише розстановку фігур: черговість ходу, рокіровку й en passant він не читає. Повний `fromFen(fen) → { board, castlingRights, enPassantTarget, turn }` запланований у `functional-coverage.md`, крок A (`src/engine/fen.js`). Доти FEN-фікстур, крім розстановки `START`, не додаємо (крок 8 нижче).

### Чого у фікстурах НЕ буде

Очікуваних результатів. Фікстура описує вхід, а `expect(...)` лишається в тесті. Інакше тест перевіряє фікстуру саму з собою.

Власного FEN-парсера. Парсер — код рушія з власними тестами. Фікстури ним користуються, а не дублюють його.

## 4. Структура файлів

```
src/test/
  setup.js            (вже є)
  fixtures/
    castling.js       ALL_CASTLING, NO_CASTLING
    state.js          makeGameState, makeSliceState, createTestStore
    boards.js         withKings, POSITIONS
    moves.js          MOVES, makeMove
    games.js          GAMES (UCI), uciToMove, playMoves
    index.js          реекспорт
```

`src/test/**` уже виключено з coverage у `vite.config.js`, а `include` підхоплює лише `*.test.*`, тому фікстури не запускаються як тести. Імпорт у тестах: `import { makeGameState, NO_CASTLING } from '../test/fixtures';`.

## 5. Менторський план

**Перенеси тестові дані в `src/test/fixtures/` так, щоб жоден тест не змінив
поведінку, а нове поле стану додавалося в одному місці.** Це рефакторинг
тестів: продакшн-код не змінюється (виняток — крок 1).

Обмеження:

- Один крок — один коміт. Після кожного `npm test` зелений.
- Кількість тестів до і після кроку однакова. Нові тести з'являються лише в
  кроках 7 і 8. Звіряй підсумок `Tests  N passed` до і після.
- Не змінюй очікування (`expect`). Якщо тест упав після переносу даних, то
  зламалися дані, а не код.
- Порядок відносно `layer-separation.md` — розділ 7.

### Крок 0. Передумова ✅

Зміни в `applyMove.test.js` закомічені (`6d9f2d5`), тож міграція не
змішається з незавершеною роботою.

### Крок 1. Прибрати `src/data/` ✅

**Мета: імпорт `gameSlice` у тестах не пише в консоль, а в `src/data/` немає
неправильних даних.**

1. Видали `console.log` з `src/data/positions.js` (це пункт
   `next-steps.md`, крок 2).
2. `MATE_IN_ONE_FEN` у `fenConstants.js` ніде не використовується і
   позначений як неточний. Видали його.

Готово, коли: `npm test` не друкує об'єкт дошки;
`grep -rn MATE_IN_ONE_FEN src` порожній.

### Крок 2. Права рокіровки ✅

**Мета: одна пара констант замість 9 копій у 7 файлах.**

1. Створи `src/test/fixtures/castling.js` з `ALL_CASTLING` і `NO_CASTLING`
   (розділ 3.1) та `src/test/fixtures/index.js` з реекспортом.
2. Заміни `NO_CASTLING_RIGHTS`, `FULL_CASTLING_RIGHTS`, `ALL_RIGHTS` і
   inline-об'єкти в `createTestStore`.

Готово, коли: `grep -rnE "NO_CASTLING_RIGHTS|FULL_CASTLING_RIGHTS|ALL_RIGHTS =" src`
порожній.

Підказка ментора: `Object.freeze` неглибокий, але тут вкладених об'єктів
немає, тож його досить. Якщо якийсь тест мутує права, після замороження він
упаде одразу, а не зламає тихо тест в іншому файлі.

### Крок 3. `makeGameState`

**Мета: одна обгортка `board → gameState` замість трьох.**

1. `src/test/fixtures/state.js`:
   `makeGameState(board, overrides = {})` →
   `{ board, castlingRights: { ...ALL_CASTLING }, enPassantTarget: null, ...overrides }`,
   реекспорт через `index.js`.
2. Заміни `makePosition` (applyMove), `baseGameState` (gameStatus),
   `gameStateBefore` (notation).
3. У gameStatus.test і notation.test дефолт був `NO_CASTLING`. Пройди кожен
   виклик і перевір, чи рокіровка може змінити результат. Якщо може, передай
   `castlingRights` явно.
4. Тест «включає рокіровку» в gameStatus.test збери через
   `makeGameState(board, { castlingRights: { ...NO_CASTLING, whiteShort: true } })`.

Готово, коли: `grep -rnwE "makePosition|baseGameState|gameStateBefore" src`
порожній, кількість тестів не змінилась.

Прапорець `-w` обов'язковий: без нього `gameStateBefore` знаходить параметр
`gameStateBeforeMove` у `notation.js`.

Підказка ментора: найнебезпечніше місце — пункт 3. Дефолт є прихованим
входом кожного тесту, тож зміна дефолту змінює вхід усіх тестів, що на нього
покладаються. Зелений тест після заміни ще не доводить, що він перевіряє те
саме. Перевірка для пункту 3: у notation.test права на `buildSan` не впливають;
у gameStatus.test тест «агрегує ходи» з `{ e1: 'K', a1: 'R' }` отримує ще хід
`e1→c1`, але перевіряє лише множину полів `from`, тому результат не змінюється.

### Крок 4. Стан стору

**Мета: один `createTestStore`, який сам підхоплює нові поля `initialState`.**

1. `makeSliceState(overrides)` =
   `{ ...gameReducer(undefined, { type: '@@INIT' }), board: {}, ...overrides }`.
2. `createTestStore(overrides)` поверх нього. Заміни обидві копії
   (gameOperations, useGameState).
3. `gameSlice.test.js` не чіпай (розділ 7).

Готово, коли: `grep -rn "function createTestStore" src` знаходить лише
`src/test/fixtures/state.js`.

Підказка ментора: чому не скопіювати `initialState` у фікстуру? Тоді копій
стане три, і `turnStartedAt` знову загубиться. Джерело істини — редюсер.
Експортувати `initialState` окремо не треба: виклик редюсера з `undefined`
повертає початковий стан.

### Крок 5. `withKings` і `POSITIONS`

**Мета: названі позиції, що трапляються у 2+ файлах, оголошені один раз.**

1. `src/test/fixtures/boards.js`: `withKings(pieces)` і `POSITIONS` з
   таблиці 3.3, лише об'єктами (розділ 3.6).
2. `POSITIONS.START` поки що будуй з `initialBoardPiecesObject`
   (`src/data/positions.js`), а не власним розбором FEN.
3. Над кожною позицією — коментар на один рядок: що на дошці, чия черга.
4. Заміни лише ті дошки, що повністю збігаються з `POSITIONS`. Решта
   лишається inline.

Готово, коли: кожна позиція з `POSITIONS` використовується щонайменше у
двох тест-файлах.

**Відкрите питання для тебе:** `POSITIONS` — це заморожені об'єкти чи
фабрики (`POSITIONS.PINNED_ROOK()`)? Заморожений об'єкт коротший, але
`Object.freeze` не заморожує вкладений `board`. Фабрика щоразу дає свіжу
копію, але кожне використання — виклик функції. Обери й обґрунтуй в описі
коміту.

### Крок 6. `MOVES` і `makeMove`

**Мета: прибрати повтор `{ captured: null, castling: null, promotion: null }`.**

1. `src/test/fixtures/moves.js`: `MOVES` (рокіровки, `E2_E4`, `D7_D5`) і
   `makeMove(partial)`.
2. Заміни повні об'єкти ходу в `notation.test.js` і ходи рокіровки в
   `applyMove.test.js`.

Готово, коли: у `notation.test.js` немає жодного `castling: null`.

### Крок 7. Партії в UCI і `playMoves`

**Мета: перевірити повний пайплайн thunk → рушій → редюсер на справжніх
партіях.**

1. `src/test/fixtures/games.js`: `GAMES` у форматі UCI (розділ 3.6).
   Почни з `FOOLS_MATE`, потім додай коротку партію з рокіровкою та en passant.
2. `uciToMove('e7e8q')` → `{ from: 'e7', to: 'e8', promotion: 'Q' }`.
3. `playMoves(store, sequence)`: для кожного ходу бере `piece` з дошки в
   сторі й диспатчить `attemptMove`.
4. Нові тести в `gameOperations.test.js`: дитячий мат →
   `isGameOver: true`, `reason: 'checkmate'`; SAN в `history` збігається з
   очікуваним списком.

Готово, коли: нові тести зелені. Якщо замінити останній хід дитячого мату на
нелегальний, тест падає зі зрозумілим повідомленням.

Підказка ментора: `playMoves` бере фігуру з дошки через селектор, а не через
`state.game.board`. Після кроку 4 `layer-separation.md` дошка переїде в
`state.position`, і селектор захистить хелпер від цієї зміни.

### Крок 8. FEN-позиції

**Передумова: `functional-coverage.md`, крок A (`src/engine/fen.js` з
`fromFen` і `toFen`).**

**Мета: повні позиції зберігаються у FEN і заразом перевіряють парсер.**

1. `POSITIONS.START` = `fromFen(STARTING_FEN)` замість
   `initialBoardPiecesObject`.
2. Додай `POSITIONS.KIWIPETE` (FEN у розділі 3.6) для perft
   (`next-steps.md`, крок 4).
3. Тест у `src/engine/fen.test.js`: для кожної позиції з `POSITIONS`
   `fromFen(toFen(position))` дорівнює `position`.

Готово, коли: round-trip проходить для всіх `POSITIONS`, а perft бере
позиції з фікстур.

Підказка ментора: черга ходу у FEN обов'язкова. Навіть якщо на момент цього
кроку `turn` ще не частина позиції (відкрите питання кроку 4 шарів),
`fromFen` її повертає. Вирішувати треба, де вона зберігається, а не чи її
читати.

### Крок 9. Документація

1. Онови `next-steps.md`, крок 8: познач виконані частини.
2. У README заміни «заплановано» на опис `src/test/fixtures/` і додай папку
   в дерево структури.

### Чекліст здачі

- [x] Крок 0: `applyMove.test.js` закомічено
- [x] Крок 1: `src/data/` без `console.log` і `MATE_IN_ONE_FEN`
- [x] Крок 2: `ALL_CASTLING` / `NO_CASTLING`, жодної локальної копії
- [x] Крок 3: `makeGameState` (дефолт `ALL_CASTLING`), gameStatus і notation перевірені
- [ ] Крок 4: один `createTestStore` на основі редюсера
- [ ] Крок 5: `withKings`, `POSITIONS`; відкрите питання вирішене
- [ ] Крок 6: `MOVES`, `makeMove`
- [ ] Крок 7: `GAMES` в UCI, `playMoves`, інтеграційні тести
- [ ] Крок 8: FEN-позиції й round-trip (після кроку A)
- [ ] Крок 9: README і `next-steps.md` оновлені
- [ ] Кількість тестів після кроків 1–6 не змінилась

Питання для самоперевірки (відповідай усно на рев'ю):

1. Чому `makeGameState` за замовчуванням дає `ALL_CASTLING` і коли тест
   мусить передати `NO_CASTLING` явно?
2. Чому фікстура не містить очікуваного результату?
3. Чому маленькі позиції — об'єкти, а Kiwipete — FEN?
4. Чому партії записані в UCI, а не в SAN?
5. Що станеться, якщо тест змінить незаморожену спільну фікстуру, і чому
   такий баг важко знайти?
6. Коли дошку краще лишити inline, навіть якщо вона повторюється?

## 6. Правила та ризики

**Правила**
- Фікстура переїжджає в спільний модуль, коли з'являється в другому файлі. До того вона живе в тесті.
- Константи заморожені (`Object.freeze`, для вкладених об'єктів — глибоко), а білдери щоразу повертають новий об'єкт. Тест не може зіпсувати фікстуру для інших тестів.
- Назва позиції описує патерн (`PINNED_ROOK`), а не тест, у якому її вперше використали.
- Біля кожної позиції — коментар на 1 рядок: що на дошці і чия черга.
- Фікстури не містять очікуваних результатів (див. 3.5).
- Формат: маленькі позиції — об'єкти, повні — FEN, партії — UCI (див. 3.6).

**Ризики**
- *Магічні фікстури.* Якщо тест перевіряє конкретні клітинки, дошку краще лишити inline або розгорнути через `withKings({...})`.
- *Рокіровка за замовчуванням.* `makeGameState` дає `ALL_CASTLING`, тож рокіровка непомітно потрапляє в списки ходів у позиціях з королем на e1/e8 і турою в куті. Новий тест, що перевіряє точний список або кількість ходів, передає `NO_CASTLING` явно.
- *`makeSliceState` залежить від `initialState`.* Якщо початковий стан зміниться, зміняться й усі тести стору. Це очікувана поведінка, але `board` у білдері завжди перевизначається на `{}`, щоб тести не залежали від стартової розстановки.

## 7. Зв'язок з іншими документами

**`layer-separation.md`.** Кроки 3 і 4 змінюють форму стану: `moveExecuted` отримує готову позицію, а стан ділиться на слайси `position` / `game` / `ui`. Порядок:

| Крок фікстур | Коли робити | Чому |
| --- | --- | --- |
| 1–3 (рокіровка, `makeGameState`) | Зараз, до кроку 3 шарів | Рівень рушія: форма `{ board, castlingRights, enPassantTarget }` не змінюється |
| 4 (`createTestStore`) | До кроку 3 шарів | Крок 4 шарів тоді змінює `preloadedState` в одному місці, а не у двох файлах |
| 4 (gameSlice.test) | Не мігрувати | Крок 3 шарів переносить тести рокіровки з gameSlice.test у рушій; нові тести слайса одразу пишуться через фікстури |
| 5–7 (позиції, ходи, партії) | Після кроку 4 шарів | `playMoves` і названі позиції проходять через нову форму стану без переписування |
| 8 (FEN-позиції) | Після `functional-coverage.md`, крок A | Потрібен повний `fromFen`; власного парсера у фікстурах не пишемо |

Відкрите питання кроку 4 шарів про `turn` безпосередньо стосується `makeGameState`. Якщо черга стане частиною `position`, білдер отримує поле `turn: 'w'` за замовчуванням, а `POSITIONS` — явний `turn` там, де ходять чорні.

**`next-steps.md`.** Крок 4 (perft) бере стартову позицію з `POSITIONS.START`. Позиції з еталонними числами (Kiwipete) додаються в `POSITIONS` як FEN.

**`functional-coverage.md`.** Крок A (FEN в обидва боки): round-trip тест проганяє всі `POSITIONS`. Крок E (`fast-check`): генератори випадкових позицій живуть поруч, у `fixtures/`.
