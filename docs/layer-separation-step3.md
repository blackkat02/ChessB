# Крок 3: товстий thunk, тонкий редюсер

Дата: 2026-11-03. Доповнення до `docs/layer-separation.md`, розділ 6.
Формат: таска від ментора. Готові розв'язки сховані під спойлерами. Спершу
спробуй сам, а відкривай їх, лише коли застрягнеш або захочеш звірити.

## 0. Де ти зараз

| Крок | Стан |
|---|---|
| 1. Константи | ✅ |
| 2. `applyMove` | ✅ 235 тестів зелені |
| 3. Товстий thunk | 🟡 3.1–3.3 ✅, далі 3.4 |
| 4, 5 | ⬜ |

Правки Prettier закомічено окремо (`fc288b7`), 3.1–3.2 — у `b79cc58`.

## 1. Що не так зараз

Відкрий `gameSlice.js`, редюсер `moveExecuted`. Він досі робить чотири речі,
які не є "записати дані":

1. **Шах і мат** — `isCheck`, `isCheckmate` з `engine/gameStatus`.
2. **SAN** — `buildSan` з `engine/notation`.
3. **Колір фігури** — `getPieceColor` з `engine/chessHelpers`, щоб знати,
   чий годинник зменшувати.
4. **Час** — `Date.now()`. Через це редюсер нечистий: той самий action
   двічі дає різний стан. Те саме в `endGame`.

А `attemptMove` у `gameOperations.js` навпаки знає забагато про
**внутрішню будову** рушія: імпортує `pseudoMoves`, `legalMoves`,
`gameStatus`, `promotion`, `chessHelpers` напряму і сам складає з них
"легальність" (рядки 56–84). Фасад `engine/index.js` при цьому містить
заглушки, що кидають помилку.

Після кроку 3 має бути навпаки:

```
attemptMove (thunk)                       moveExecuted (reducer)
───────────────────                       ──────────────────────
читає позицію зі стану                    state.board = payload.position.board
питає рушій: чи легальний хід?            ...castlingRights, enPassantTarget
applyMove → нова позиція + details        зменшує годинник payload.color
getStatus суперника → шах/мат/пат         history.push(запис з payload)
toSan → рядок запису                      plyCount += 1
Date.now() → timestamp                    selectedSquare = null
dispatch(moveExecuted(всеГотове))
mat/пат → dispatch(endGame(...))
```

## 2. Таска

**Перенеси всі обчислення з `moveExecuted` у `attemptMove`, а `attemptMove`
переведи на фасад `engine/index.js`.** Форма стану Redux не змінюється
(це крок 4), поведінка гри — теж.

Критерії готовності:

1. `gameSlice.js` не імпортує нічого з `src/engine`:
   `grep -n "engine" src/redux/game/gameSlice.js` порожній.
2. Увесь `src/redux` імпортує рушій лише через фасад:
   `grep -rn "engine/" src/redux` порожній (дозволено лише `'../../engine'`).
3. `Date.now()` у `gameSlice.js` трапляється лише в `prepare`-колбеку
   `endGame`, у тілах редюсерів — жодного разу.
4. Фасад має робочі `getLegalMoves`, `isMoveLegal`, `getStatus`, `toSan`
   з власними тестами в `src/engine/index.test.js`.
5. `npm test` зелений, гра в браузері працює: звичайні ходи, рокіровка,
   взяття на проході, промоція, мат, пат, годинники, ходи в режимі аналізу
   після кінця партії.
6. Жоден тест не видалено без заміни (див. таблицю в п. 3.3).

## 3. Покроковий план

Кожен підкрок нижче залишає тести зеленими. Можеш комітити їх окремо, але
перед PR об'єднай у один коміт кроку 3 (правило "один крок — один коміт").

### 3.1. Фасад: `getLegalMoves` і `isMoveLegal` ✅

Контракт:

```js
/**
 * Легальні цільові клітинки для фігури на `from`.
 * Геометрія + безпека короля + рокіровка. Колір береться з фігури на дошці.
 * Порожня клітинка → [].
 *
 * @param {{ board, castlingRights, enPassantTarget }} position
 * @param {string} from
 * @returns {string[]}
 */
export function getLegalMoves(position, from)

export function isMoveLegal(position, from, to) // → boolean
```

Що врахувати:

- Логіка вже існує у двох місцях: `gameOperations.js:56-84` і
  `getAllLegalMoves` у `gameStatus.js`. Не пиши третю копію. Найкраще —
  винести перевірку однієї клітинки в `getLegalMoves` (або в
  `legalMoves.js`) і переписати `getAllLegalMoves` через неї.
- Рокіровку **не** пропускай через `filterByKingSafety`: `getCastlingMoves`
  уже перевіряє шах і прохід короля сам (коментар у `gameOperations.js`
  пояснює чому).
- `getPseudoLegalMoves` вже не повертає клітинки зі своїми фігурами. Тож
  `selectIsFriendlyFire` у thunk-у стає зайвим. Сам селектор поки не видаляй,
  його замінить `selectLegalTargets` на кроці 4.

Тести (`src/engine/index.test.js`): порожня клітинка, звичайна фігура, фігура
у зв'язці (не може ходити, бо відкриє короля), король з рокіровкою, король
без права рокіровки, пішак з en passant. Позиції — через `makeGameState` з
`src/test/fixtures`.

<details>
<summary>Розв'язок: <code>getLegalMoves</code></summary>

```js
export function getLegalMoves(position, from) {
  const { board, castlingRights, enPassantTarget } = position;
  const piece = board[from];
  if (!piece) return [];

  const color = getPieceColor(piece);
  const pseudo = getPseudoLegalMoves(board, from, enPassantTarget);
  const safe = filterByKingSafety(board, from, pseudo, color, enPassantTarget);

  const castling =
    piece.toUpperCase() === 'K'
      ? getCastlingMoves(board, color, castlingRights)
      : [];

  return [...safe, ...castling];
}

export function isMoveLegal(position, from, to) {
  return getLegalMoves(position, from).includes(to);
}
```

І `getAllLegalMoves` у `gameStatus.js` стає циклом по фігурах кольору з
викликом `getLegalMoves(gameState, square)`. Але увага: тоді `gameStatus.js`
імпортує з `index.js`, а `index.js` — з `gameStatus.js`. Щоб не робити цикл,
поклади `getLegalMoves` у `legalMoves.js`, а фасад нехай лише ре-експортує.

</details>

### 3.2. Фасад: `getStatus` і `toSan` ✅

```js
/**
 * Статус сторони `color` у позиції. Легальні ходи рахуються ОДИН раз.
 * @returns {{ isCheck: boolean, isCheckmate: boolean, isStalemate: boolean }}
 */
export function getStatus(position, color)

/**
 * SAN для ходу. move — { from, to, piece } разом із details від applyMove
 * (captured, castling, promotion). status — статус СУПЕРНИКА після ходу.
 */
export function toSan(positionBefore, move, status)
```

- `getStatus` замінює пару `isCheckmate` + `isStalemate`, які зараз обидві
  рахують `getAllLegalMoves` заново. Мат = шах і ходів немає, пат = шаху немає
  і ходів немає.
- `toSan` — це просто `buildSan` під публічним іменем:
  `export { buildSan as toSan } from './notation'`. Перейменовувати сам
  `buildSan` не треба.
- Додай у фасад ре-експорти, яких бракуватиме thunk-у та селекторам:
  `getPieceColor`, `getOpponentColor`, `requiresPromotion`,
  `isValidPromotionPiece`.
- Видали `getMoveDetails`: ним ніхто не користується (перевір `grep`), а
  `applyMove` + `getStatus` роблять те саме прозоріше. Прибери також
  коментар-шапку фасаду з середини файлу нагору.

Тести: `getStatus` для звичайної позиції, шаху, мату (back-rank) і пату.
`toSan` достатньо одного тесту-димка: решта покрита в `notation.test.js`.

<details>
<summary>Розв'язок: <code>getStatus</code></summary>

```js
export function getStatus(position, color) {
  const inCheck = isCheck(position.board, color);
  const hasMoves = getAllLegalMoves(position, color).length > 0;

  return {
    isCheck: inCheck,
    isCheckmate: inCheck && !hasMoves,
    isStalemate: !inCheck && !hasMoves,
  };
}
```

</details>

### Чому 3.3–3.7 ідуть саме в такому порядку

Payload, thunk і редюсер пов'язані одним контрактом — формою action
`moveExecuted`. Якщо thunk почне слати новий payload раніше, ніж редюсер
навчиться його читати, гра зламається. Якщо навпаки — теж. А ще
`moveExecuted({ from, to, piece })` зі старою формою викликався 30 разів у
`gameSlice.test.js` і раз у `store.test.jsx`.

Тому зміна контракту — одна атомарна зміна (3.5). Але її можна зробити
**малою**, якщо спершу прибрати з дороги все, що від контракту не залежить:

```
3.3 Перенос тестів правил   ──┐ готуємо ґрунт; старий контракт ще працює
3.4 Фікстури                ──┘
3.5 Перемикання payload     ──── одна атомарна зміна: thunk + редюсер + тести запису
3.6 endGame + prepare       ──┐ доводимо до критеріїв
3.7 Прибирання, нові тести  ──┘
```

Після кожного підкроку `npm test` зелений.

### 3.3. Перенос тестів, що перевіряють шахи, а не запис ✅

> Виконано. 18 файлів тестів зелені.

Ідея: тести рокіровки, en passant, промоції та SAN у `gameSlice.test.js`
перевіряли **правила** через редюсер. Якщо переписати їх через `applyMove` або
`attemptMove`, вони проходять і **до**, і **після** перемикання payload. Тоді
в 3.5 лишається переписати лише тести **запису**.

Що зроблено з кожною групою `gameSlice.test.js`:

| Група | Що зроблено | Де тепер перевірка |
|---|---|---|
| «крок 4» — рокіровка, права, en passant (10 `it`) | видалено | `applyMove.test.js`: «рокіровка», «права рокіровки в новій позиції», «en passant», «enPassantTarget у новій позиції», `nextCastlingRights` |
| «крок 6» — промоція (4 `it`) | видалено | `applyMove.test.js`: «промоція» + `gameOperations.test.js`: «attemptMove — промоція» |
| «крок 7» — SAN (6 `it`) | переписано | `gameOperations.test.js`: «attemptMove — нотація» |

Для двох тестів відповідника не знайшлося, тож їх **додано** в
`applyMove.test.js`, а не просто видалено:

- «звичайний хід короля на сусідню клітинку → castling = null, тура на місці»;
- «пішак не на останній ряд → promotion = null».

Нюанс SAN-тестів через `attemptMove`: позиції мають бути **легальними**.
Редюсер ковтав будь-яку дошку, а thunk перевіряє правила: обидва королі на
дошці, хід за чергою (`plyCount` парний — білі), хід не лишає свого короля під
шахом. Тест на `#` заодно перевіряє, що мат завершує партію (`reason:
'checkmate'`, `winner: 'b'`).

У `gameSlice.test.js` лишилося 12 тестів: запис (captured, analysis,
selection/plyCount), годинник, повний запис партії, `endGame`.

**Коміт:** `test: move chess-rule tests from gameSlice to engine and attemptMove`

### 3.4. Фікстури: `createTestStore` і `makeMovePayload`

1. **`createTestStore`** переїжджає з `gameOperations.test.js` у
   `src/test/fixtures/state.js` і експортується через `fixtures/index.js`.
   Сигнатура та сама: `createTestStore(gameStateOverrides)`. На кроці 4 його
   доведеться оновити (три слайси) — краще в одному місці.
2. **`makeMovePayload(overrides)`** — повний валідний payload нової форми для
   тестів слайса, **без рушія**:

   ```js
   export function makeMovePayload(overrides = {}) {
     return {
       move: { from: 'e2', to: 'e4', piece: 'P' },
       color: 'w',
       position: {
         board: { e4: 'P' },
         castlingRights: { ...NO_CASTLING },
         enPassantTarget: 'e3',
       },
       details: { captured: null, castling: null, enPassant: false, promotion: null },
       isCheck: false,
       isCheckmate: false,
       san: 'e4',
       timestamp: 1_000_000,
       ...overrides,
     };
   }
   ```

   Тест слайса тепер перевіряє «редюсер записав те, що прийшло», а не
   «редюсер правильно зіграв у шахи». Значення в payload можуть бути навіть
   фізично неможливими — редюсеру байдуже, і саме це ми перевіряємо.

Поки що `makeMovePayload` ніде не використовується — це нормально. Онови
`docs/test-fixtures.md`.

**Коміт:** `test: move createTestStore to fixtures, add makeMovePayload`

### 3.5. Перемикання payload — головна частина

Три зміни нижче комітяться **разом**: окремо кожна ламає гру або тести.

#### 3.5.1. Новий payload

```js
moveExecuted({
  move: { from, to, piece, promotion },  // що попросив гравець
  color,               // хто ходив: 'w' | 'b' — щоб редюсер не питав рушій
  position,            // нова позиція від applyMove
  details,             // captured, castling, enPassant, promotion
  isCheck, isCheckmate,
  san,
  timestamp,           // Date.now() у thunk-у
  analysis,            // true — хід після завершення партії (лише тоді)
})
```

`color` береться з фігури (`getPieceColor(piece)`), а не з `turn`: у режимі
аналізу черга не перевіряється, і білі можуть піти двічі поспіль.

#### 3.5.2. `buildMovePayload` і новий `attemptMove`

Локальна функція в `gameOperations.js`, не експортується. Потрібна обом
гілкам: звичайному ходу й аналізу.

<details>
<summary>Розв'язок: <code>buildMovePayload</code></summary>

```js
function buildMovePayload(position, moveData, extra = {}) {
  const { from, to, piece, promotion } = moveData;
  const move = { from, to, piece, promotion };
  const color = getPieceColor(piece);

  const { position: after, details } = applyMove(position, move);
  const status = getStatus(after, getOpponentColor(color));
  const san = toSan(position, { ...move, ...details }, status);

  const payload = {
    move,
    color,
    position: after,
    details,
    isCheck: status.isCheck,
    isCheckmate: status.isCheckmate,
    san,
    timestamp: Date.now(),
    ...extra,
  };

  return { payload, status };
}
```

</details>

**Чому `{ payload, status }`, а не `status` усередині payload.** Action
містить лише те, що записується в стан. `isStalemate` редюсеру не потрібен —
лише thunk-у, щоб вирішити, чи диспатчити `endGame`. Зайве поле в action
рано чи пізно хтось почне читати в редюсері, і логіка знову попливе туди.

Новий порядок `attemptMove`:

1. `position = selectPosition(state)` — **до** гілки аналізу, бо там вона теж
   потрібна.
2. Партія завершена → `buildMovePayload(position, moveData, { analysis: true })`,
   `dispatch`, вихід. Без перевірок і без `endGame`.
3. Час, черга, `from === to`, `isMoveLegal`, промоція — без змін.
4. `const { payload, status } = buildMovePayload(position, moveData)`.
5. `dispatch(moveExecuted(payload))`.
6. `status.isCheckmate` → `endGame` з перемогою `turn`; `status.isStalemate` →
   нічия. **Без `getState()` після диспатчу**: нову позицію thunk порахував
   сам, перечитувати її з Redux — питати те, що ми щойно самі сказали.
7. Невикористаний `time` з деструктуризації — геть.

Помітиш, що в режимі аналізу редюсер ставить `turnStartedAt = timestamp`,
хоча партія вже закінчена. Це поточна поведінка, годинники не йдуть завдяки
`isGameOver` у `selectClockRemaining`. **Не виправляй**, запиши в
`docs/next-steps.md`.

#### 3.5.3. Тонкий `moveExecuted`

Редюсер тепер лише:

- присвоює `board`, `castlingRights`, `enPassantTarget` з `payload.position`;
- рахує `moveTimeMs = timestamp - turnStartedAt` (якщо годинник ішов) і
  зменшує годинник `payload.color`;
- `turnStartedAt = timestamp`;
- додає запис у `history`;
- `plyCount += 1`, `selectedSquare = null`.

**Запис у `history` має лишитися тієї самої форми**, що й зараз:
`MoveListView`, persist і тести на нього спираються. Три пастки:

1. **Порядок `...move, ...details`.** `move.promotion` може бути `undefined`,
   а `details.promotion` — уже розв'язана `'Q'`. `details` іде **другим**,
   щоб перекрити. Інакше в записі не буде промоції, хоча SAN буде `e8=Q`.
2. **`...(analysis && { analysis })`.** Раніше `analysis` потрапляв у запис
   через `...action.payload` лише тоді, коли був переданий. Просте
   `analysis,` додасть `analysis: undefined` кожному ходу — новий ключ у
   persist і зламані `toEqual`.
3. **Імпорти.** Після зміни `grep -n engine src/redux/game/gameSlice.js` має
   бути порожнім.

<details>
<summary>Розв'язок: <code>moveExecuted</code></summary>

```js
moveExecuted: (state, action) => {
  const { move, color, position, details, isCheck, isCheckmate, san, timestamp, analysis } =
    action.payload;

  state.board = position.board;
  state.castlingRights = position.castlingRights;
  state.enPassantTarget = position.enPassantTarget;

  let moveTimeMs = 0;
  if (typeof state.turnStartedAt === 'number') {
    moveTimeMs = timestamp - state.turnStartedAt;
    if (color === COLORS.WHITE) {
      state.whiteTime = Math.max(0, state.whiteTime - moveTimeMs);
    } else {
      state.blackTime = Math.max(0, state.blackTime - moveTimeMs);
    }
  }
  state.turnStartedAt = timestamp;

  state.selectedSquare = null;
  state.history.push({
    ...move,
    ...details,
    isCheck,
    isCheckmate,
    san,
    timestamp,
    moveTimeMs,
    clockAfter: { w: state.whiteTime, b: state.blackTime },
    ...(analysis && { analysis }),
  });
  state.plyCount += 1;
},
```

</details>

#### 3.5.4. Тести запису на `makeMovePayload`

12 тестів, що лишились у `gameSlice.test.js`, переводяться на
`moveExecuted(makeMovePayload({...}))`:

- **Запис** (captured, analysis, selection/plyCount) — потрібні поля
  підміняються через `overrides`, наприклад
  `details: { ...,  captured: 'p' }` або `analysis: true`.
- **Годинник і повний запис партії** — `vi.setSystemTime` більше не потрібен:
  час приходить у `payload.timestamp`. Тест «`timestamp` елемента дорівнює
  новому `turnStartedAt`» стає тривіальним — і це доказ чистоти редюсера:
  однаковий action дає однаковий стан без жодного мокання часу.
- **`endGame`** — не чіпаєш до 3.6.

І `store.test.jsx`: `moveExecuted({ from: 'e2', to: 'e4', piece: 'P' })` →
`moveExecuted(makeMovePayload())`.

**Коміт:** `refactor(redux): compute move in attemptMove, make moveExecuted record-only`

### 3.6. `endGame` через `prepare`

`endGame` диспатчать чотири thunk-и (`attemptMove`, `timeExpired`,
`resignGame`, `offerDraw`). Дописувати `timestamp: Date.now()` у кожен виклик
— повторення, яке рано чи пізно десь забудуть. `prepare` робить це в одному
місці, в action creator:

```js
endGame: {
  reducer(state, action) {
    const { winner, reason, timedOutColor, timestamp } = action.payload;
    // ...як було, але elapsed = timestamp - state.turnStartedAt
  },
  prepare(payload) {
    return { payload: { ...payload, timestamp: Date.now() } };
  },
},
```

Виклики `endGame({ winner, reason })` у коді не змінюються. Тести `endGame` з
`vi.setSystemTime` теж: `prepare` спрацьовує в момент виклику `endGame(...)`
у тесті. `grep -n "Date.now" src/redux/game/gameSlice.js` має знаходити
рівно один рядок — у `prepare`.

**Коміт:** `refactor(redux): move Date.now out of endGame reducer via prepare`

### 3.7. Прибирання і нові тести

- `gameSelectors.js`: `getPieceColor` з `'../../engine'`, не з
  `engine/chessHelpers`.
- `gameConstants.js`: `COLORS` з `'../../engine'`.
- Після цього `grep -rn "engine/" src/redux` порожній.
- Нові тести в `gameOperations.test.js`:
  - нелегальний хід (фігура у зв'язці) → `history` порожній;
  - пат → `winner: 'draw'`, `reason: 'stalemate'`;
  - хід після мату → застосовано, `analysis: true`, є `san`, `endGame` вдруге
    не диспатчиться;
  - `vi.setSystemTime(5000)` → `history[0].timestamp === 5000`.
- Тести `getLegalMoves` і `getStatus` в `src/engine/index.test.js` (таблиці
  з 3.1 і 3.2).
- `docs/next-steps.md`: рядок про `turnStartedAt` у режимі аналізу.

## 4. Перевірка перед комітом

```sh
grep -n "engine" src/redux/game/gameSlice.js        # порожньо
grep -rn "engine/" src/redux                         # порожньо
grep -n "Date.now" src/redux/game/gameSlice.js       # лише в prepare
npm test
npm run lint
```

І руками в браузері: Scholar's mate (мат за 4 ходи), коротка рокіровка,
промоція, хід після мату (аналіз), перезавантаження сторінки посеред партії.

## 5. Питання на рев'ю

1. Redux Style Guide радить тримати логіку в редюсерах. Чому тут навпаки?
   (Підказка: `layer-separation.md`, підказка ментора до кроку 3.)
2. Чому `Date.now()` у `prepare` не робить редюсер нечистим?
3. Навіщо в payload поле `color`, якщо його можна отримати з `move.piece`?
4. Чому thunk більше не читає `getState()` після `dispatch(moveExecuted)`?
5. Що станеться з persist-збереженням, зробленим до кроку 3? Чи треба
   піднімати `SCHEMA_VERSION` уже зараз? (Відповідь: ні. Форма **стану** не
   змінилась, змінилась лише форма **action**. Поясни, чому це різні речі.)
