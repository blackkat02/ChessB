# Live coding #4: слайс `position`

Дата: 2026-11-08. Тренування live coding на реальному коді проєкту.
Обсяг: підкрок 4.4 з `docs/layer-separation-step4.md` разом із persist
позиції, поданий як самостійна задача, без готових розв'язків у тексті.
Попередні сесії: `livecoding-01-turn-in-position.md`,
`livecoding-02-game-events.md`, `livecoding-03-ui-slice.md`.

## Формат

- **45 хвилин**, таймер видимий.
- **Думаєш уголос.** Мовчазні 5 хвилин — гірше, ніж неправильна ідея,
  сказана вголос.
- **Тест спершу.** Новий слайс починається з червоного
  `positionSlice.test.js`.
- Можна: документація Redux Toolkit, MDN, Vitest, власний код проєкту.
  Не можна: AI-асистенти, розділи 4.4 і 4.6 у `layer-separation-step4.md`.
- 2–4 коміти по зелених кроках.

Старт:

```sh
git switch -c live/position-slice
npm test        # усе зелене ДО початку
```

## Умова (читається вголос на старті)

> У `state.game` досі живе позиція — `board`, `castlingRights`,
> `enPassantTarget`, `turn`. Це вхід для рушія, а не запис партії: її
> рахує `applyMove`, а редюсер лише переписує поля одне за одним.
>
> Винеси її в окремий слайс `position`: `state.position = { board,
> castlingRights, enPassantTarget, turn }`. Власних команд у слайсу немає —
> позицію змінюють лише події з `gameEvents.js`.
>
> Поведінка гри для гравця не змінюється, зокрема партія посеред гри
> відновлюється після перезавантаження сторінки.

## Критерії приймання

1. `src/redux/position/positionSlice.js`: початковий стан — стандартна
   розстановка, повні права рокіровки, `enPassantTarget: null`,
   `turn: 'w'`. Реакція на `moveExecuted` (позиція з `payload.position`) і
   `newGameStarted` (початкова позиція). `reducers` порожній.
2. `positionSlice.js` не імпортує жодного іншого слайсу, і жоден слайс не
   імпортує його.
3. `Object.keys(store.getState().game)` не містить жодного поля позиції.
4. Селектори позиції (`selectBoard`, `selectPosition`, `selectCurrentTurn`,
   `selectIsWhiteTurn`, `selectPieceAtSquare`, `selectIsSquareEmpty`,
   `selectPieceColorAt`, `selectIsOwnPiece`) живуть у
   `src/redux/position/positionSelectors.js` і читають `state.position`.
   Ніде в коді немає `state.game.board`, `state.game.turn` тощо.
5. `src/redux/position/positionSlice.test.js` покриває початковий стан і
   обидві реакції з п. 1.
6. Persist зберігає позицію; після перезавантаження посеред партії дошка,
   черга, історія й годинники відповідають одне одному.
7. `npm test` зелений, жоден тест не видалено без заміни.
8. Ти можеш пояснити, чому `positionSlice` має лише `extraReducers`, і чому
   `selectPosition` тепер може бути без `createSelector`.

## Орієнтовний таймлайн

| Хвилини | Що | На що дивиться ментор |
|---|---|---|
| 0–5 | Умова, пошук усіх читачів і писачів чотирьох полів, план уголос | Чи знайдено селектори, тести і `newGameStarted` у `gameSlice` |
| 5–15 | `positionSlice.test.js` червоний → `positionSlice.js` → зелений | Тест до коду; `return action.payload.position` пояснено |
| 15–25 | `positionSelectors.js`, `store.js`, прибрати поля з `gameSlice` | Чи знає, що зламається, **до** запуску тестів |
| 25–38 | Фікстури, червоні тести, persist | Рішення щодо `createTestStore` назване вголос |
| 38–45 | Коміти, підсумок, критерій 8 | Чи помічено «нова партія зі старою дошкою» |

Якщо на 25-й хвилині `positionSlice` ще не підключений до store — скажи
це вголос і вирішуй, що скорочуєш.

## Підказки

Відкривай по одній, лише якщо застряг більше ніж на 3 хвилини. Кожну
відкриту підказку назви вголос.

<details>
<summary>Підказка 1: з чого почати</summary>

`grep -rn "\.game\.\(board\|castlingRights\|enPassantTarget\|turn\b\)" src`.
Поза тестами всі читання — у `gameSelectors.js`. А скільки їх у тестах, і
що з ними станеться після розбиття?

</details>

<details>
<summary>Підказка 2: тестовий store</summary>

`createTestStore({ board: {...}, plyCount: 2 })` кладе все в `game`. Після
розбиття `board` у `game` — мертвий ключ, а `state.position` стартує зі
стандартної розстановки. Скільки викликів передають поля позиції? Чи
змінювати їх усі, чи лише фікстуру, — і чим це рішення платиш?

</details>

<details>
<summary>Підказка 3: нова партія</summary>

Подивись, що зараз робить `newGameStarted` у `gameSlice`. Хто після твоєї
зміни повертає дошку на початкову розстановку? Чи є тест, що це перевіряє?

</details>

<details>
<summary>Підказка 4: перезавантаження сторінки</summary>

Відкрий `store.js`: що зараз іде в `savePersistedGame` і що збирається в
`preloadedState`? Зроби три ходи, перезавантаж сторінку — що на дошці, а що
в історії ходів?

</details>

## Stretch (якщо лишився час)

- `selectLegalTargets` (підкрок 4.5) замість `selectIsFriendlyFire` і
  `selectIsMovePossible`.
- Тест на `newGameStarted` через справжній store: після ходу і нової партії
  дошка — стандартна, `turn: 'w'`, історія порожня.

---

## Для ментора

Розділ нижче кандидат не читає до кінця сесії.

<details>
<summary>Ключ: що має змінитися</summary>

- `src/redux/position/positionSlice.js` (новий): `initialState` з
  `initialBoardPiecesObject` (імпорт переїжджає з `gameSlice`), повні права
  рокіровки, `enPassantTarget: null`, `turn: COLORS.WHITE`. `reducers: {}`
  (без нього типи RTK 2 у редакторі сваряться — це не помилка рантайму).
  `extraReducers`: `moveExecuted` → `return action.payload.position`;
  `newGameStarted` → `return initialState`.
- `src/redux/position/positionSelectors.js` (новий): вісім селекторів з
  критерію 4. `selectPosition = (state) => state.position`.
- `gameSelectors.js`: лишаються селектори запису партії.
  `selectIsClockActive` і `selectClockRemaining` читають чергу через
  `selectCurrentTurn` з `positionSelectors`. `selectIsFriendlyFire` і
  `selectIsMovePossible` — лише оновити імпорти (їх прибирає 4.5).
- `gameSlice.js`: прибрані чотири поля з `initialState`, їхні присвоєння в
  `moveExecuted`, імпорт `initialBoardPiecesObject`.
- `store.js`: `reducer: { position, game, ui }`; persist
  `{ position, game, ui: { playerSide } }`; `SCHEMA_VERSION` 5 → 6.
- Імпорти селекторів: `useGameState.js`, `ChessBoardContainer.jsx`,
  `gameOperations.js` (`selectPosition`, `selectCurrentTurn`).
- `src/test/fixtures/store.js`: `createTestStore` має вміти задати позицію
  окремо від `game`.
- `gameSlice.test.js`: тест «бере board, castlingRights, enPassantTarget і
  turn з payload.position» і тест «на старті партії хід білих» переїжджають
  у `positionSlice.test.js`.
- `gameOperations.test.js`: 16 читань позиції з `getState().game` — через
  селектори або `state.position`.
- `store.test.jsx`: збережені стани нової форми; тест «flag on reconnect»
  тримає `turn: 'b'` у `game` — після розбиття він має бути в `position`.

</details>

<details>
<summary>Ключ: дві тихі пастки</summary>

**`newGameStarted`.** Зараз позицію скидає `gameSlice` через
`...initialState`. Якщо кандидат прибирає поля з `gameSlice`, а в
`positionSlice` додає лише `moveExecuted`, — нова партія стартує зі
старою дошкою і чергою. Тестів на скидання позиції в новій партії немає,
`npm test` буде зеленим. Ловиться підказкою 3 або вручну в браузері.

**Persist.** `savePersistedGame` пише `{ game, ui }`. Без `position` після
перезавантаження історія й годинники відновлюються, а дошка — стандартна,
`turn: 'w'`. Тест «flag on reconnect» впаде (хід чорних губиться, таймаут не
спрацьовує) — але кандидат може «полагодити» тест, а не persist. Слабка
відповідь: перекласти `turn` у тесті кудись, щоб позеленів. Сильна:
пояснити, чому тест упав, і полагодити збереження.

Прийнятне рішення: зберігати `{ position, game, ui: { playerSide } }`,
`SCHEMA_VERSION` → 6, рядок у журналі версій, `preloadedState` з
`position: persisted.position`. Тест: збереження з позицією після одного
ходу відновлює її повністю.

</details>

<details>
<summary>Ключ: фікстура <code>createTestStore</code></summary>

19 з 23 викликів передають поля позиції пласко. Прийнятні рішення:

1. **Вкладена форма** `createTestStore({ position, game, ui })` — як план
   4.0. Механічний diff на 23 виклики, але тест показує форму стану.
   За 45 хвилин — ризиковано; нормально, якщо кандидат це вирішив уголос і
   встиг.
2. **Другий аргумент** `createTestStore(gameOverrides, positionOverrides)`
   і переведення лише тих викликів, що передають поля позиції.
3. **Фікстура розкладає відомі ключі позиції** (`POSITION_KEYS`) по
   слайсах. Найшвидше, але це та сама «магія», від якої застерігає 4.0.
   Прийнятно лише з поясненням ціни і записом у `docs/next-steps.md`.

Червоний прапорець: фікстура лишає `board` у `game`, а тести «зеленіють»,
бо їх переписано на очікування стандартної розстановки.

Друга дрібна пастка: `blackE5` у `gameSlice.test.js` будує
`payload.position` **без** `turn`. Якщо перенести його в
`positionSlice.test.js` як є, `turn` після ходу стане `undefined`.
Сильний кандидат помітить, що payload-фікстура має відповідати контракту
`applyMove`.

</details>

<details>
<summary>Рубрика оцінювання</summary>

| | 1 — слабко | 2 — норм | 3 — сильно |
|---|---|---|---|
| **Комунікація** | мовчить | коментує дії | спершу план, потім дії; каже, що зламається, до запуску тестів |
| **Тести** | без `positionSlice.test.js` | тести після коду | червоний тест перед слайсом; тест на скидання позиції в новій партії |
| **Пошук** | знайдено лише селектори | знайдено й читання в тестах | знайдено все на 0–5 хвилині, `newGameStarted` названо вголос |
| **Обсяг** | робить 4.5 замість 4.4 | робить задачу | робить задачу і явно називає, що свідомо не робить |
| **Git** | один коміт | кілька комітів | коміти по зелених кроках з осмисленими назвами |
| **Persist** | не помічено або полагоджено тест замість коду | помічено після підказки 4 | помічено самостійно, `SCHEMA_VERSION` підвищено з поясненням |

Червоні прапорці: `positionSlice` імпортує `gameSlice` (або навпаки);
позиція дублюється в обох слайсах «на перехідний період»; власний
`reducers` у `positionSlice` (наприклад, `setBoard`); видалений тест без
заміни; тест підлаштовано під баг.

</details>

## Питання після сесії

1. Чому `positionSlice` не має власних `reducers`? Що було б не так із
   командою `setBoard`?
2. Чому `return action.payload.position` — легальний спосіб змінити стан з
   Immer, а `state = action.payload.position` — ні?
3. Чому `selectPosition` більше не потребує `createSelector`? Коли
   мемоізація знову знадобиться?
4. Чому тест «flag on reconnect» упав, і що було б, якби ти полагодив тест,
   а не persist?
5. Де межа між `position` і `game`: чому `turn` у позиції, а `plyCount` — ні?
6. Що зробила б команда, у якої немає тесту на нову партію після ходу?
