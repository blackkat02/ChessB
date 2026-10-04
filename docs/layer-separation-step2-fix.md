# Крок 2: розбір помилок і таска на виправлення

Дата: 2026-10-04. Доповнення до `docs/layer-separation.md`, розділ 5.
Формат: пояснення від ментора + покрокова таска. Готові розв'язки сховані під
спойлерами. Спершу спробуй сам, а відкривай їх, лише коли застрягнеш або
захочеш звірити.

## 0. Де ти зараз

| Крок | Стан |
|---|---|
| 1. Константи | ✅ зроблено, але не закомічено |
| 2. `applyMove` | ❌ розпочато, гра зламана, 32 тести червоні |
| 3, 4 | ⬜ ще не починали |

Чому червоні тести:

- **28 тестів у `gameSlice.test.js`.** У редюсері `moveExecuted` закоментовано
  все, крім `plyCount += 1`, тож дошка, history, годинник і SAN більше не
  оновлюються.
- **4 тести в `gameOperations.test.js` (промоція).** Причина та сама: thunk
  диспатчить `moveExecuted`, а дошка не змінюється.

Отже, тести не "зламались самі". Вони правильно показують, що поведінка
зникла. Саме для цього в таски є правило: на кроці 2 старі тести слайса
не міняються.

---

## 1. Ментальна модель: що взагалі робить `applyMove`

### 1.1. Позиція

**Позиція** — це мінімальний набір даних, за яким можна застосувати шахові
правила:

```js
position = {
  board: { e1: 'K', e2: 'P', ... },            // клітинка → фігура, і НІЧОГО більше
  castlingRights: { wK, wQ, bK, bQ },          // хто ще має право рокірувати
  enPassantTarget: 'e3' | null,                // куди можна бити на проході цей напівхід
}
```

Це той самий набір, що й у FEN (поля 1, 3, 4). Годинники, history й виділена
клітинка до позиції не належать: правилам ходу байдуже, скільки в тебе часу.

### 1.2. Хід і результат

```
applyMove(positionBefore, move) → { position: positionAfter, details }
```

- `move` — це **намір**: `{ from, to, piece, promotion? }`.
- `position` — **нова** позиція після ходу.
- `details` — **факти про хід**, які вже не видно з позиції після нього, хоча
  вони потрібні history й SAN:

| Поле | Значення | Навіщо | Чому не видно з `positionAfter` |
|---|---|---|---|
| `captured` | `'p'` / `null` | `x` у SAN, список взятих | Побиту фігуру прибрано з дошки |
| `castling` | `'K'` / `'Q'` / `null` | SAN `O-O` / `O-O-O` | Король уже стоїть на g1, і не видно, як він туди потрапив |
| `enPassant` | `true` / `false` | history, підсвітка | Жертва стояла не на `to` |
| `promotion` | `'Q'` / `'N'` / … / `null` | SAN `e8=Q` | На `e8` уже ферзь, і не видно, що це був пішак |

Правило: усе, що можна обчислити **лише в момент ходу**, рушій мусить
повернути в `details`. Пізніше дізнатися це вже не вийде.

### 1.3. Чому `applyMove` не можна мутувати вхідну позицію

Це питання №1 із чекліста здачі, тому розберемо його детально.

**У редюсері** `state` — це не справжній стан, а *чернетка* (draft) Immer.
Коли ти пишеш `delete state.board.e2`, Immer нічого не видаляє в реальному
об'єкті. Він записує зміну й наприкінці збирає **новий** об'єкт стану. Тому в
редюсері мутації безпечні.

**У рушії** Immer немає. Якщо `applyMove` зробить `delete position.board.e2`,
зміниться **той самий об'єкт**, який передали на вхід. Наслідки:

1. **Ламається SAN.** Нотації потрібна позиція *до* ходу, щоб вирішити, чи
   писати `Nbd2` чи просто `Nd2`. Якщо `applyMove` змінив вхідний об'єкт,
   "до" і "після" стають одним об'єктом. Старий редюсер мав для цього
   окремий костиль: `gameStateBeforeMove = { board: { ...state.board } }`.
   Чиста функція робить його непотрібним.
2. **Ламаються тести.** Тест готує позицію, викликає `applyMove` і перевіряє
   результат. Якщо вхід змінився, наступна перевірка в тому ж тесті працює
   вже зі зміненими даними.
3. **У майбутньому зламається `getLegalMoves`.** Він "приміряє" кожен
   кандидатний хід. Якщо примірка мутує позицію, після першого ж кандидата
   дошка вже інша.

Як цього уникнути:

```js
const board = { ...position.board }; // нова "коробка" з тими самими значеннями
delete board.e2;                     // змінюємо лише копію
```

Поверхневої копії (`...`) тут **досить**, бо значення в `board` — це рядки
(`'P'`, `'k'`), а рядки незмінні. Глибока копія потрібна лише тоді, коли
всередині лежать об'єкти, які ти збираєшся змінювати. `castlingRights`
теж копіюється: це робить `nextCastlingRights` (`const rights = { ...current }`).

---

## 2. Розбір `src/engine/applyMove.js` — що не так і чому

> Поки писався цей документ, ти вже виправив баг 1 і закоментував
> присвоєння з бага 2. Усе одно прочитай пояснення: важливо розуміти, **чому**
> це були помилки. Закоментований код видали зовсім: залишки зі старої
> логіки в рушії лише заплутують.

### Баг 1. Взяття на проході ніколи не спрацює

```js
piece.toUpperCase() === 'P' && to === board.enPassantTarget && !captured;
//                                    ^^^^^ має бути position
```

`board` — це словник «клітинка → фігура». Ключа `enPassantTarget` у ньому
немає, тож вираз завжди дорівнює `to === undefined`, тобто `false`. Пішак-жертва
залишиться на дошці.

> **Як це помітити самому:** у старому редюсері було `state.enPassantTarget`.
> Під час перенесення ти механічно замінив `state.` на `board.`, але
> `state` у старому коді — це **вся позиція**, а не дошка. Правильна заміна:
> `state.board` → `board` (локальна копія), а `state.X` → `position.X`.

### Баг 2. У дошку записуються поля, які не є клітинками

```js
board.castlingRights = nextCastlingRights(...);
board.enPassantTarget = nextEnPassantTarget(...);
```

Ці рядки — залишок від `state.castlingRights = …` у редюсері, і там вони були
правильні. Але тут `board` — дошка, тож після ходу вона виглядає так:

```js
{ e4: 'P', ..., castlingRights: { wK: true, ... }, enPassantTarget: 'e3' }
```

Рушій обходить дошку через `Object.entries(board)` (`attacks.js:74`,
`gameStatus.js:37`) і вважає **кожен ключ клітинкою, а кожне значення
фігурою**. Він спробує викликати `getPieceColor({ wK: true, … })` і впаде або
порахує нісенітницю. Тест `expect(next.board).toEqual({ e4: 'P' })` теж
впаде через зайві ключі.

Ці значення **вже правильно** обчислюються в `return { position: { … } }`
нижче, тож два рядки треба просто видалити.

### Баг 3. `details` завжди порожній

```js
details: { captured: undefined, castling: undefined, enPassant: undefined, promotion: undefined }
```

Це заглушка, яку ти не заповнив. Дані для неї вже є в коді:

- `captured` — змінна вже існує, лишилося її повернути. Не забудь `null`
  замість `undefined`: тест перевіряє `toBeNull()`.
- `enPassant` — це `isEnPassantCapture`, тобто `true` або `false`.
- `castling` — `castlingRookMove ? castlingRookMove.side : null`.
- `promotion` — `isPromotion ? pieceToPlace.toUpperCase() : null`. Велика
  літера потрібна, бо SAN пише `e8=Q` для обох кольорів.

### Дрібниці

- `// ...` навколо `delete board[from]` — сміття, прибери.
- `nextCastlingRights` і `nextEnPassantTarget` тепер викликаються двічі. Після
  виправлення бага 2 залишиться по одному виклику.
- Коментарі зі старого редюсера (чому `captured` беремо **до** перезапису,
  де стоїть жертва взяття на проході, чому промоція обов'язкова) загубились.
  Поверни їх: це пояснення правил, і їм місце саме в рушії.

---

## 3. Розбір `src/redux/game/gameSlice.js` — що сталося

Ти правильно відчув, що редюсер має схуднути, але зробив це **на крок
раніше**. Межа між кроками така:

| Що | Крок 2 (зараз) | Крок 3 |
|---|---|---|
| Перестановка фігур, рокіровка, на проході, промоція | `applyMove` ✅ | `applyMove` |
| Хто викликає `applyMove` | **редюсер** | thunk |
| Шах / мат суперника, SAN | **редюсер** | thunk |
| `Date.now()`, годинник | **редюсер** | `Date.now()` у payload |
| `history.push`, `plyCount`, скидання виділення | редюсер | редюсер |

На кроці 2 з редюсера виїжджає **лише перший рядок таблиці**. Усе інше
лишається на місці й працює як раніше. Тому старі тести мають пройти без
змін, і це доводить, що перенесення нічого не зламало.

Сценарій редюсера на кроці 2:

```
1. before = позиція з state (board, castlingRights, enPassantTarget)
2. { position, details } = applyMove(before, action.payload)
3. записати position у state
4. статус суперника (isCheck / isCheckmate) — на position
5. SAN — buildSan(before, { from, to, piece, ...details }, статус)
6. годинник і Date.now() — без змін зі старого коду
7. history.push({ ...payload, ...details, isCheck, isCheckmate, san, timestamp, moveTimeMs, clockAfter })
8. selectedSquare = null, plyCount += 1
```

Зверни увагу на пункт 5: `before` можна передати в `buildSan` **без
копіювання**, бо `applyMove` його не змінює. Це і є виграш від чистої функції.

> **Тонкий момент з Immer.** `state.board` у редюсері — чернетка. Передати її
> в `applyMove` можна: `{ ...state.board }` прочитає всі поля й створить
> звичайний об'єкт. Потім ти **замінюєш** `state.board = position.board`
> замість того, щоб мутувати, і для Immer це звичайне присвоєння.

---

## 4. Таска

### 4.0. Підготовка: гілка і коміт кроку 1

Зараз усе лежить на `dev` у вигляді незакомічених змін, які змішують три різні
речі: міграцію ESLint, крок 1 і незавершений крок 2. Розклади їх по комітах.

1. `git switch -c refactor/layers`. Незакомічені зміни перейдуть разом із
   тобою.
2. **Коміт `chore`** (не входить у кроки таски, тому окремо):
   `eslint.config.js`, видалення `.eslintrc.cjs`, `package.json`,
   `package-lock.json`, `.prettierrc`.
3. **Коміт кроку 1.** Тимчасово поверни крок 2 до попереднього стану:
   - збережи свою `src/engine/index.js` кудись поза `src` (наприклад, у
     `index.step2.js.bak` у корені) і відкоти: `git restore src/engine/index.js`;
   - `git restore src/redux/game/gameSlice.js` і в ньому виправ лише два
     імпорти: `../../utils/boardUtils` → `../../engine/boardUtils`,
     `../../utils/chessHelpers` → `../../engine/chessHelpers`;
   - `applyMove.js` не додавай у коміт: це файл кроку 2;
   - `npm test` має бути повністю зеленим;
   - закоміть `constants.js`, переміщені `boardUtils`/`chessHelpers`, усі
     виправлені імпорти й `docs`/`README` з новими шляхами. **В описі коміту
     поясни**, чому `chessHelpers` і `boardUtils` переїхали в рушій (пункт 4
     кроку 1).
4. Поверни свою `index.js` з бекапу й переходь до 4.1.

### 4.1. Виправ `applyMove.js`

1. Баг 1: `board.enPassantTarget` → `position.enPassantTarget`.
2. Баг 2: видали два присвоєння `board.castlingRights` і `board.enPassantTarget`.
3. Баг 3: заповни `details` реальними значеннями (див. розділ 2).
4. Прибери `// ...` і поверни коментарі-пояснення правил.

<details>
<summary>Розв'язок: тіло <code>applyMove</code></summary>

```js
export function applyMove(position, move) {
  const { from, to, piece, promotion } = move;
  const board = { ...position.board }; // власна копія — вхідну позицію не чіпаємо

  // Захоплюємо фігуру з `to` ДО перезапису — інакше вона губиться назавжди.
  let captured = board[to] || null;

  // Взяття на проході: жертва стоїть НЕ на `to`, а поруч (той самий ряд,
  // що й `from`, той самий файл, що й `to`).
  const isEnPassantCapture =
    piece.toUpperCase() === 'P' && to === position.enPassantTarget && !captured;

  if (isEnPassantCapture) {
    const { row: fromRow } = algebraicToCoords(from);
    const { col: toCol } = algebraicToCoords(to);
    const capturedPawnSquare = coordsToAlgebraic(fromRow, toCol);
    captured = board[capturedPawnSquare];
    delete board[capturedPawnSquare];
  }

  // Промоція обов'язкова; без явного вибору — ферзь.
  const isPromotion = requiresPromotion(piece, to);
  const pieceToPlace = isPromotion ? resolvePromotionPiece(piece, promotion) : piece;

  delete board[from];
  board[to] = pieceToPlace;

  // Рокіровка: король пішов на 2 клітинки — пересуваємо й туру.
  const castlingRookMove = getCastlingRookMove(piece, from, to);
  if (castlingRookMove) {
    const rook = board[castlingRookMove.from];
    delete board[castlingRookMove.from];
    board[castlingRookMove.to] = rook;
  }

  return {
    position: {
      board,
      castlingRights: nextCastlingRights(position.castlingRights, move),
      enPassantTarget: nextEnPassantTarget(move),
    },
    details: {
      captured,
      castling: castlingRookMove ? castlingRookMove.side : null,
      enPassant: isEnPassantCapture,
      promotion: isPromotion ? pieceToPlace.toUpperCase() : null,
    },
  };
}
```

</details>

### 4.2. Поверни поведінку в `moveExecuted`

1. Поверни імпорти рушія. На кроці 2 це нормально: вони зникнуть на кроці 3.
   `applyMove` імпортуй з фасаду `../../engine`, а решту тимчасово з
   внутрішніх модулів.
2. Напиши редюсер за сценарієм з розділу 3.
3. Видали всі закоментовані рядки. Історія старого коду є в git, тримати її
   в файлі не треба.
4. `npm test` → `gameSlice.test.js` і `gameOperations.test.js` повністю
   зелені **без змін у тестах**.
5. Відкрий гру в браузері й зіграй: звичайний хід, взяття, рокіровку, взяття
   на проході, промоцію, мат. Перевір history і годинники.

<details>
<summary>Розв'язок: <code>moveExecuted</code> для кроку 2</summary>

```js
import { applyMove } from '../../engine';
// Тимчасово, до кроку 3 (там це переїде в attemptMove):
import { getPieceColor, getOpponentColor } from '../../engine/chessHelpers';
import { isCheck, isCheckmate } from '../../engine/gameStatus';
import { buildSan } from '../../engine/notation';

// ...

moveExecuted: (state, action) => {
  const { from, to, piece } = action.payload;

  // Позиція ДО ходу. Копія не потрібна: applyMove вхід не мутує,
  // тож `before` лишається "до" і для нотації.
  const before = {
    board: state.board,
    castlingRights: state.castlingRights,
    enPassantTarget: state.enPassantTarget,
  };
  const { position, details } = applyMove(before, action.payload);

  state.board = position.board;
  state.castlingRights = position.castlingRights;
  state.enPassantTarget = position.enPassantTarget;

  const opponentColor = getOpponentColor(getPieceColor(piece));
  const givesCheckmate = isCheckmate(position, opponentColor);
  const givesCheck = givesCheckmate || isCheck(position.board, opponentColor);

  const san = buildSan(
    before,
    { from, to, piece, captured: details.captured, castling: details.castling, promotion: details.promotion },
    { isCheck: givesCheck, isCheckmate: givesCheckmate }
  );

  const now = Date.now();
  let moveTimeMs = 0;
  if (typeof state.turnStartedAt === 'number') {
    moveTimeMs = now - state.turnStartedAt;
    if (getPieceColor(piece) === COLORS.WHITE) {
      state.whiteTime = Math.max(0, state.whiteTime - moveTimeMs);
    } else {
      state.blackTime = Math.max(0, state.blackTime - moveTimeMs);
    }
  }
  state.turnStartedAt = now;

  state.selectedSquare = null;
  state.history.push({
    ...action.payload,
    ...details,
    isCheck: givesCheck,
    isCheckmate: givesCheckmate,
    san,
    timestamp: now,
    moveTimeMs,
    clockAfter: { w: state.whiteTime, b: state.blackTime },
  });
  state.plyCount += 1;
},
```

Зверни увагу на порядок `...action.payload, ...details`. `details.promotion`
(`'Q'` або `null`) має **перезаписати** сирий `promotion` з payload (який
може бути `undefined` чи `'q'`). Тест «звичайний хід пішака не встановлює
promotion» перевіряє саме це.

</details>

### 4.3. Прибери фасад `src/engine/index.js`

1. Перенеси шапку-коментар (`// src/engine/index.js — Публічний фасад…`) на
   початок файлу, перед імпортами.
2. Видали `getMoveDetails`. Її ніхто не викликає, і вона змішує позицію з
   деталями в один плаский об'єкт, тобто робить протилежне до контракту
   `applyMove`. На кроці 3 її місце займуть `getStatus` і `toSan`. Заглушки
   `isMoveLegal`/`getLegalMoves` поки лиши: вони для кроку 3.
3. У `src/hooks/useGameState.js:6` видали закоментований імпорт.

### 4.4. Напиши `src/engine/applyMove.test.js`

Тести рушія не потребують store. Ти готуєш позицію як звичайний об'єкт,
викликаєш функцію й перевіряєш результат. Шаблон:

```js
import { describe, it, expect } from 'vitest';
import { applyMove } from './applyMove';

const ALL_RIGHTS = { wK: true, wQ: true, bK: true, bQ: true };
const pos = (board, extra = {}) => ({
  board,
  castlingRights: ALL_RIGHTS,
  enPassantTarget: null,
  ...extra,
});

describe('applyMove', () => {
  it('звичайний хід переставляє фігуру й нічого не бере', () => {
    const { position, details } = applyMove(pos({ e2: 'P' }), { from: 'e2', to: 'e4', piece: 'P' });

    expect(position.board).toEqual({ e4: 'P' });
    expect(position.enPassantTarget).toBe('e3');
    expect(details).toEqual({ captured: null, castling: null, enPassant: false, promotion: null });
  });

  it('не змінює вхідну позицію', () => {
    const input = pos({ e2: 'P', d3: 'p' });
    const snapshot = structuredClone(input);

    applyMove(input, { from: 'e2', to: 'd3', piece: 'P' });

    expect(input).toEqual(snapshot);
  });
});
```

Обов'язковий мінімум (з `layer-separation.md`, крок 2, пункт 6):

- [ ] звичайний хід
- [ ] взяття (`captured` = фігура з `to`)
- [ ] взяття на проході (жертва зникла, `enPassant: true`, `captured: 'p'`)
- [ ] коротка рокіровка білих (король g1, тура f1, `castling: 'K'`, права білих скинуті)
- [ ] довга рокіровка чорних (`castling: 'Q'`)
- [ ] промоція без вибору → ферзь (`'Q'` на дошці, `promotion: 'Q'`)
- [ ] промоція з вибором чорних (`promotion: 'n'` → `'n'` на дошці, `details.promotion: 'N'`)
- [ ] взяття тури на h8 відбирає `bK`; хід тури з a1 відбирає `wQ`
- [ ] вхідна позиція не змінилась (**включно з `castlingRights`**)
- [ ] у `position.board` немає ключів, крім клітинок (тест-захист від бага 2)

Порада: спершу напиши тест на взяття на проході й **запусти його на старій
версії `applyMove`**, до виправлення бага 1. Він має впасти. Тест, який ти
жодного разу не бачив червоним, нічого не доводить.

### 4.5. Коміт кроку 2

Готово, коли:

- `npm test` повністю зелений;
- `gameSlice.test.js` не змінювався (`git diff src/redux/game/gameSlice.test.js` порожній);
- у `gameSlice.js` немає жодної функції поза `createSlice`;
- гра в браузері працює.

Повідомлення, наприклад: `refactor(engine): extract applyMove from moveExecuted reducer`.

---

## 5. Перевір себе (усно)

1. Чому `board.enPassantTarget` завжди `undefined`, а `position.enPassantTarget` ні?
2. Що піде не так у `isSquareAttacked`, якщо в `board` лежить ключ
   `castlingRights`?
3. Чому в старому редюсері був `gameStateBeforeMove = { board: { ...state.board } }`,
   а в новому `before` можна взяти без копії?
4. Чому поверхневої копії `{ ...position.board }` достатньо?
5. Чому `details.promotion` — велика літера, а на дошці для чорних — мала?
6. Чому на кроці 2 SAN і годинник ще лишаються в редюсері, хоч у цільовій
   архітектурі їх там немає?
