# Крок 3: товстий thunk, тонкий редюсер

Дата: 2026-11-03. Доповнення до `docs/layer-separation.md`, розділ 6.
Формат: таска від ментора. Готові розв'язки сховані під спойлерами. Спершу
спробуй сам, а відкривай їх, лише коли застрягнеш або захочеш звірити.

## 0. Де ти зараз

| Крок | Стан |
|---|---|
| 1. Константи | ✅ |
| 2. `applyMove` | ✅ 235 тестів зелені |
| 3. Товстий thunk | ⬜ цей документ |
| 4, 5 | ⬜ |

У робочій копії лежать незакомічені правки Prettier у `legalMoves.js`,
`gameOperations.js` і `gameSlice.test.js` (лише переноси рядків). **Перед
стартом закоміть їх окремо**, наприклад `style: apply prettier`. Інакше diff
кроку 3 змішається з форматуванням і на рев'ю його буде важко читати.

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
6. Жоден тест не видалено без заміни (див. таблицю в п. 3.6).

## 3. Покроковий план

Кожен підкрок нижче залишає тести зеленими. Можеш комітити їх окремо, але
перед PR об'єднай у один коміт кроку 3 (правило "один крок — один коміт").

### 3.1. Фасад: `getLegalMoves` і `isMoveLegal`

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

export const isMoveLegal = (position, from, to) =>
  getLegalMoves(position, from).includes(to);
```

І `getAllLegalMoves` у `gameStatus.js` стає циклом по фігурах кольору з
викликом `getLegalMoves(gameState, square)`. Але увага: тоді `gameStatus.js`
імпортує з `index.js`, а `index.js` — з `gameStatus.js`. Щоб не робити цикл,
поклади `getLegalMoves` у `legalMoves.js`, а фасад нехай лише ре-експортує.

</details>

### 3.2. Фасад: `getStatus` і `toSan`

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

### 3.3. Новий payload `moveExecuted`

```js
moveExecuted({
  move: { from, to, piece, promotion },  // що попросив гравець
  color,               // хто ходив: 'w' | 'b' — щоб редюсер не питав рушій
  position,            // нова позиція від applyMove
  details,             // captured, castling, enPassant, promotion
  isCheck, isCheckmate,
  san,
  timestamp,           // Date.now() у thunk-у
  analysis,            // true — хід після завершення партії
})
```

Поле `color` — відповідь на пункт 3 з розділу 1: редюсеру потрібен колір, щоб
зменшити правильний годинник, але викликати `getPieceColor` він більше не
може. Thunk знає колір, тож просто передає його.

**Запис у `history` має лишитися тієї самої форми, що й зараз.**
`MoveListView`, persist і тести на нього спираються. Зараз він складається
так: `{ ...action.payload, ...details, isCheck, isCheckmate, san, timestamp,
moveTimeMs, clockAfter }`. Тепер — з `move` замість `action.payload`.
Порядок важливий: `details.promotion` (вже розв'язана фігура, `'Q'`) має
перекрити `move.promotion` (може бути `undefined`). `analysis: true`
теж має потрапити в запис (є тест "не втрачає інші поля payload").

### 3.4. Thunk `attemptMove`

Новий порядок:

1. Партія завершена → **гілка аналізу** (див. нижче).
2. Час вичерпано → `timeExpired`, вихід. *(без змін)*
3. Хід не за чергою → вихід. *(без змін)*
4. `from === to` → вихід. *(без змін)*
5. `!isMoveLegal(position, from, to)` → вихід. Замінює перевірки №3, №4, №5
   (friendly fire, геометрія, безпека короля) одним викликом.
6. Промоція з явно вказаною недійсною фігурою → вихід. *(без змін)*
7. `applyMove` → `getStatus(суперник)` → `toSan` → `Date.now()`.
8. Один `dispatch(moveExecuted(...))`.
9. Якщо `status.isCheckmate` → `endGame` з перемогою того, хто ходив; якщо
   `status.isStalemate` → нічия. **Не читай `getState()` після диспатчу**:
   статус уже порахований у кроці 7.

Позицію бери одним рядком. Додай у `gameSelectors.js`:

```js
export const selectPosition = createSelector(
  [selectBoard, (s) => s.game.castlingRights, (s) => s.game.enPassantTarget],
  (board, castlingRights, enPassantTarget) => ({ board, castlingRights, enPassantTarget })
);
```

На кроці 4 зміниться лише його тіло (`state.position`), а thunk не
зміниться взагалі.

**Гілка аналізу** (п. 3 у таску з `layer-separation.md`). Зараз там валідації
немає, а редюсер усе одно застосовує хід і рахує SAN. Тож тепер ця гілка
мусить сама зробити `applyMove` + `getStatus` + `toSan` + `timestamp`, і лише
без перевірок легальності та без `endGame`. Щоб не дублювати пункти 7–8,
винеси їх у локальну функцію `buildMovePayload(position, moveData, extra)`
у `gameOperations.js` і клич її з обох гілок.

Помітиш, що в режимі аналізу редюсер ставить `turnStartedAt = timestamp`,
хоча партія вже закінчена. Це поточна поведінка, годинники не йдуть завдяки
`isGameOver` у `selectClockRemaining`. **Не виправляй**, запиши в
`docs/next-steps.md`.

Також прибери з `gameSelectors.js` прямий імпорт `engine/chessHelpers`:
`getPieceColor` тепер є у фасаді.

<details>
<summary>Розв'язок: скелет <code>attemptMove</code></summary>

```js
import {
  isMoveLegal, applyMove, getStatus, toSan,
  getPieceColor, getOpponentColor, requiresPromotion, isValidPromotionPiece,
} from '../../engine';

function buildMovePayload(position, moveData, extra = {}) {
  const { from, to, piece, promotion } = moveData;
  const color = getPieceColor(piece);
  const result = applyMove(position, { from, to, piece, promotion });
  const status = getStatus(result.position, getOpponentColor(color));
  const san = toSan(
    position,
    { from, to, piece, ...result.details },
    status
  );

  return {
    move: { from, to, piece, promotion },
    color,
    position: result.position,
    details: result.details,
    isCheck: status.isCheck,
    isCheckmate: status.isCheckmate,
    san,
    timestamp: Date.now(),
    ...extra,
    status, // для thunk-а; редюсер це поле ігнорує
  };
}
```

Подумай, чи хочеш, щоб `status` (з `isStalemate`) їхав у payload, чи краще
повертати його з `buildMovePayload` окремо: `{ payload, status }`. Другий
варіант чистіший: action містить лише те, що записується.

</details>

### 3.5. Тонкий редюсер і `endGame` з `prepare`

`moveExecuted` тепер лише:

- присвоює `board`, `castlingRights`, `enPassantTarget` з `payload.position`;
- рахує `moveTimeMs = timestamp - turnStartedAt` (якщо годинник ішов) і
  зменшує годинник `payload.color`;
- `turnStartedAt = timestamp`;
- додає запис у `history` (форма з п. 3.3);
- `plyCount += 1`, `selectedSquare = null`.

`endGame` також використовує `Date.now()` для таймауту. Тут thunk-а може не
бути (`resignGame`, `offerDraw`, `timeExpired` — усі thunk-и, але action
можна диспатчити й напряму). Тому використай `prepare`-колбек:

```js
endGame: {
  reducer(state, action) { /* використовує action.payload.timestamp */ },
  prepare(payload) {
    return { payload: { ...payload, timestamp: Date.now() } };
  },
},
```

`prepare` викликається в action creator, а не в редюсері. Тож редюсер
залишається чистим, а виклик `endGame({...})` для решти коду не змінюється.

Перевір: `gameSlice.js` імпортує лише `createSlice`,
`initialBoardPiecesObject` і `gameConstants`.

### 3.6. Тести

Спершу винеси `createTestStore` з `gameOperations.test.js` у
`src/test/fixtures/state.js` і експортуй через `fixtures/index.js`.
`layer-separation.md` уже на нього посилається, а на кроці 4 його треба буде
оновлювати в одному місці. Онови `docs/test-fixtures.md`.

Додай у фікстури `makeMovePayload(overrides)`: збирає повний валідний
payload для тестів слайса (тихий хід `e2→e4`, `timestamp: 1_000_000`), а
`overrides` дозволяє підмінити поля. Тести слайса більше не мають залежати
від рушія.

Куди переїжджають тести з `gameSlice.test.js`:

| Група в `gameSlice.test.js` | Куди | Як |
|---|---|---|
| `moveExecuted` (captured, analysis, plyCount, selection) | лишається | на `makeMovePayload` |
| "крок 4" — рокіровка, права, en passant | `applyMove.test.js` | вже покрито → видалити, звіривши кожен `it` з `applyMove.test.js` |
| "крок 6" — промоція | `applyMove.test.js` + `gameOperations.test.js` | вже покрито → видалити |
| "крок 7" — SAN (`x`, `+`, `#`, `O-O`, `=Q`) | `gameOperations.test.js` | через `attemptMove`, перевіряти `history[0].san` |
| годинник, повний запис партії | лишається | `timestamp` у payload замість `vi.setSystemTime` |
| `endGame` — таймаут | лишається | `vi.setSystemTime` ще потрібен (через `prepare`) |

Правило "не видаляй без заміни": для кожного `it`, який видаляєш, має існувати
тест з тією ж перевіркою деінде. Якщо не знаходиш — переноси, а не видаляй.

Нові тести в `gameOperations.test.js`:

- нелегальний хід (фігура у зв'язці) нічого не диспатчить;
- рокіровка через `attemptMove` рухає і короля, і туру;
- мат завершує партію (`winner`, `reason: 'checkmate'`);
- пат завершує партію нічиєю;
- після кінця партії хід в аналізі застосовується без перевірок і має `san`;
- `history[0].timestamp` дорівнює `Date.now()` у момент thunk-а
  (`vi.setSystemTime`).

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
