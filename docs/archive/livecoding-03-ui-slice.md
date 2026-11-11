# Live coding #3: слайс `ui`

Дата: 2026-11-05. Тренування live coding на реальному коді проєкту.
Обсяг: підкрок 4.3 з `docs/layer-separation-step4.md`, поданий як
самостійна задача, без готових розв'язків у тексті. Попередні сесії:
`livecoding-01-turn-in-position.md`, `livecoding-02-game-events.md`.

## Формат

- **45 хвилин**, таймер видимий.
- **Думаєш уголос.** Мовчазні 5 хвилин — гірше, ніж неправильна ідея,
  сказана вголос.
- **Тест спершу.** Новий слайс починається з червоного `uiSlice.test.js`.
- Можна: документація Redux Toolkit, MDN, Vitest, власний код проєкту.
  Не можна: AI-асистенти, розділ 4.3 у `layer-separation-step4.md`.
- 2–4 коміти по зелених кроках.

Старт:

```sh
git switch -c live/ui-slice
npm test        # усе зелене ДО початку
```

## Умова (читається вголос на старті)

> У `state.game` зараз живуть два поля, які не мають стосунку до партії:
> `selectedSquare` (на яку клітинку клікнули) і `playerSide` (якою
> стороною повернута дошка). Це стан екрана, а не запис партії.
>
> Винеси їх в окремий слайс `ui`: `state.ui = { selectedSquare,
> playerSide }`. Команда `setSelection` переїжджає туди ж. На події
> `moveExecuted` і `newGameStarted` слайс `ui` реагує сам — через події з
> `gameEvents.js`, без імпорту `gameSlice`.
>
> Поведінка гри для гравця не змінюється. Позиція (`board` тощо) лишається
> в `state.game` — її переїзд не входить у задачу.

## Критерії приймання

1. `src/redux/ui/uiSlice.js`: початковий стан `{ selectedSquare: null,
   playerSide: 'w' }`, редюсер `setSelection`, реакція на `moveExecuted`
   (скидає виділення) і `newGameStarted` (скидає виділення, бере сторону з
   `payload.side`).
2. `uiSlice.js` не імпортує `gameSlice.js`, а `gameSlice.js` не імпортує
   `uiSlice.js`.
3. `state.game` не містить `selectedSquare` і `playerSide`; `gameSlice` не
   має `setSelection`.
4. `selectSelectedSquare` і `selectPlayerSide` читають `state.ui` і живуть
   у `src/redux/ui/uiSelectors.js`. Ніде в коді немає
   `getState().game.playerSide` чи `state.game.selectedSquare`.
5. `src/redux/ui/uiSlice.test.js` покриває всі три реакції з п. 1.
6. `npm test` зелений, жоден тест не видалено без заміни.
7. Ти можеш пояснити, що після твоєї зміни відбувається з `playerSide` при
   перезавантаженні сторінки, і що ти з цим зробив.

## Орієнтовний таймлайн

| Хвилини | Що | На що дивиться ментор |
|---|---|---|
| 0–5 | Умова, пошук усіх читачів і писачів двох полів, план уголос | Чи знайдено **всіх** — і селектори, і прямі `getState().game.*` |
| 5–18 | `uiSlice.test.js` червоний → `uiSlice.js` → зелений | Тест до коду; події з `gameEvents`, не з `gameSlice` |
| 18–28 | `store.js`, фікстури, селектори, прибрати поля з `gameSlice` | Чи падають тести з **зрозумілих** причин |
| 28–38 | Червоні тести, `resignGame`, persist | Діагностика, а не «правлю, поки не позеленіє» |
| 38–45 | Коміти, підсумок, критерій 7 | Чи помічено регресію persist |

Якщо на 28-й хвилині `uiSlice` ще не підключений до store — скажи це
вголос і вирішуй, що скорочуєш.

## Підказки

Відкривай по одній, лише якщо застряг більше ніж на 3 хвилини. Кожну
відкриту підказку назви вголос.

<details>
<summary>Підказка 1: з чого почати</summary>

`grep -rn "selectedSquare\|playerSide\|setSelection" src` — список усіх
місць. Розділи їх на: хто **пише** (слайс), хто **читає через селектор**,
хто **читає напряму** зі стану. Останні — найнебезпечніші.

</details>

<details>
<summary>Підказка 2: тестовий store</summary>

`src/test/fixtures/store.js` збирає store лише з `gameReducer`. Без `ui`
у ньому будь-який тест, що читає `selectSelectedSquare`, отримає помилку
`Cannot read properties of undefined`. Як дати тестам задавати стан `ui`,
не ламаючи 21 існуючий виклик `createTestStore`?

</details>

<details>
<summary>Підказка 3: <code>resignGame</code></summary>

Подивись, звідки `resignGame` бере `playerSide`. Що поверне
`getOpponentColor(undefined)`? Чи є тест, який це зловить?

</details>

<details>
<summary>Підказка 4: перезавантаження сторінки</summary>

Відкрий `store.js`: що саме передається в `savePersistedGame`? Зіграй за
чорних, зроби хід, перезавантаж сторінку — як повернута дошка?

</details>

## Stretch (якщо лишився час)

- Тест на `resignGame` у `gameOperations.test.js`: гравець за чорних
  здається → переможець білі. Зараз цієї перевірки немає взагалі.
- `getStatus(position, color = position.turn)` — хвіст із сесії #1.

---

## Для ментора

Розділ нижче кандидат не читає до кінця сесії.

<details>
<summary>Ключ: що має змінитися</summary>

- `src/redux/ui/uiSlice.js` (новий): `reducers: { setSelection }`,
  `extraReducers`: `moveExecuted` → `selectedSquare = null`;
  `newGameStarted` → `selectedSquare = null`, `playerSide = payload.side`.
  Тип `setSelection` стає `'ui/setSelection'` — це нормально, його немає в
  `PERSIST_ON`.
- `src/redux/ui/uiSelectors.js` (новий): `selectSelectedSquare`,
  `selectPlayerSide`. Прибрані з `gameSelectors.js`. Але
  `selectIsMovePossible` у `gameSelectors.js` читає `selectSelectedSquare` —
  його треба імпортувати з `uiSelectors` (або помітити, що
  `selectIsMovePossible` мертвий код — це 4.5, не чіпати).
- `gameSlice.js`: прибрані два поля з `initialState`, `setSelection`,
  `state.selectedSquare = null` у `moveExecuted`, `playerSide: side` у
  `newGameStarted`.
- `store.js`: `reducer: { game, ui }`.
- `useGameState.js`, `ChessBoardContainer.jsx`: імпорти селекторів і
  `setSelection` з `ui/`.
- `gameOperations.js`, `resignGame`: `selectPlayerSide(getState())`.
- `src/test/fixtures/store.js`: `createTestStore(gameOverrides, uiOverrides)`
  або `ui`-ключ в overrides — будь-яке рішення, що не ламає існуючі виклики.
- `gameSlice.test.js`: тест «знімає виділення й інкрементить plyCount» —
  частина про виділення переїжджає в `uiSlice.test.js`, частина про
  `plyCount` лишається.
- `store.test.jsx`: `setSelection` з `ui/uiSlice`; збережений стан з
  `selectedSquare`/`playerSide` у `game` — ці ключі тепер мертві.

</details>

<details>
<summary>Ключ: дві тихі пастки</summary>

**`resignGame`.** `getState().game.playerSide` стає `undefined`.
`getOpponentColor(undefined)` повертає `'w'` (`chessHelpers.js:8`:
`color === 'w' ? 'b' : 'w'`), тобто **при здачі завжди перемагають білі**.
Тестів на `resignGame` немає — `npm test` буде зеленим. Ловиться лише
пошуком `getState().game` або підказкою 3. Сильний кандидат знаходить це на
0–5 хвилині, коли шукає прямі читання стану.

**Persist.** `savePersistedGame(storeApi.getState().game)` — `ui` не
зберігається. Після перезавантаження `playerSide` скидається на `'w'`:
гравець за чорних бачить дошку не тим боком. Тести зелені, бо
`store.test.jsx` не перевіряє `playerSide` після відновлення.

Прийнятні рішення для persist:

1. **Зберігати `{ game, ui: { playerSide } }` вже зараз**, `SCHEMA_VERSION`
   → 5, `preloadedState` з доповненням `selectedSquare: null`. Це шматок
   кроку 4.6 — розширення обсягу, але свідоме й назване вголос.
2. **Свідомо прийняти регресію до 4.6**, записати її в
   `docs/next-steps.md` і сказати вголос. Прийнятно лише якщо гілка не
   йде в `main` до 4.6.

Погана відповідь — не помітити. Найкраща — помітити до того, як тести
позеленіли, і обрати 1 з поясненням, чому `selectedSquare` при цьому **не**
зберігається.

</details>

<details>
<summary>Ключ: питання про <code>preloadedState</code></summary>

Якщо кандидат обирає варіант 1: `preloadedState` для слайсу **замінює**
його `initialState`, а не зливається. `ui: { playerSide: 'b' }` дасть
`selectedSquare: undefined`. Добре, якщо кандидат це передбачить; ще
краще — якщо напише на це тест.

</details>

<details>
<summary>Рубрика оцінювання</summary>

| | 1 — слабко | 2 — норм | 3 — сильно |
|---|---|---|---|
| **Комунікація** | мовчить | коментує дії | спершу план, потім дії; каже «не знаю, перевіряю ось так» |
| **Тести** | без `uiSlice.test.js` | тести після коду | червоний тест перед слайсом; тест на `resignGame` |
| **Пошук** | знайдено лише селектори | знайдено й прямі читання | знайдено все на 0–5 хвилині, `resignGame` названо вголос |
| **Обсяг** | переносить і позицію, чіпає `selectIsMovePossible` | робить задачу | робить задачу і явно називає, що свідомо не робить |
| **Git** | один коміт | кілька комітів | коміти по зелених кроках з осмисленими назвами |
| **Persist** | не помічено | помічено після підказки 4 | помічено самостійно, рішення обґрунтоване |

Червоні прапорці: `uiSlice` імпортує `gameSlice` (або навпаки); стан `ui`
дублюється в обох слайсах «на перехідний період»; правка 21 виклику
`createTestStore` вручну замість зміни фікстури; видалений тест без заміни.

</details>

## Питання після сесії

1. Чому `selectedSquare` — стан `ui`, а `board` — ні? Де межа?
2. Чому `npm test` був зеленим, хоча `resignGame` зламався? Що це каже про
   покриття?
3. Чому тип `setSelection` можна змінити, а типи подій з `gameEvents.js` —
   ні?
4. Що зберігати з `ui` при перезавантаженні, а що — ні, і чому?
5. Де в цій задачі ти найдовше думав — і чому?
