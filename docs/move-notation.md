# Запис ходів партії (нотація, історія, збереження)

Дизайн-документ для функціоналу запису ходів шахової партії: алгебраїчна
нотація (SAN), список ходів у UI, збереження в `localStorage`, експорт у PGN.

## 1. Мета

Зараз (`gameSlice.history`) ми зберігаємо лише сирі дії `{ from, to, piece }`.
Цього достатньо для відтворення дошки, але не для:

- показу гравцю читабельного списку ходів (`1. e4 e5 2. Nf3 Nc6`);
- експорту партії в PGN (щоб відкрити в lichess/chess.com або аналізаторі);
- коректного undo/перегляду попередніх позицій;
- майбутнього мультиплеєра/бота, яким потрібен однозначний запис ходу.

Документ описує: (1) яке архітектурне рішення прийняти для правил гри,
(2) модель даних ходу, (3) алгоритм побудови SAN, (4) зміни в Redux,
(5) UI-компонент списку ходів, (6) стратегію збереження в `localStorage`,
(7) PGN, (8) тестування та (9) поетапний план впровадження.

## 2. Поточний стан коду (as-is)

| Файл | Роль зараз | Обмеження |
|---|---|---|
| `redux/game/gameSlice.js` | `moveExecuted` двигає фігуру, пушить `{from,to,piece}` в `history`, інкрементить `plyCount` | не знає, чи це взяття, чи це шах/мат, чи рокіровка/en passant/промоція |
| `redux/game/gameOperations.js` (`attemptMove`) | перевіряє лише чергу ходу, `from !== to`, friendly-fire | немає перевірки шляху фігури, шаху власному королю, взагалі "легальності" ходу за правилами шахів |
| `utils/boardUtils.js` | конвертація `'e2' ↔ {row, col}` | немає руху фігур/атак |
| `redux/store.js` | на кожен `store.subscribe` серіалізує **весь** `state.game` в `localStorage['chess_game_state']` | пише на **кожен тік годинника** (раз/сек), без версії схеми, без try/catch на читанні |

Важливий висновок: **у проєкті ще немає шахового "двигуна"** (генерації
легальних ходів, детекції шаху/мату). А коректний SAN критично залежить саме
від цього — наприклад, "Nbd7" (дизамбігуація) можливий лише тоді, коли знаєш,
що інший кінь дійсно міг би легально піти на те саме поле (в т.ч. не залишивши
свого короля під шахом).

## 3. Термінологія

- **Ply (напівхід)** — один хід одного гравця. `plyCount` у слайсі — це саме
  це поле.
- **Move (хід)** — пара напівходів (білі + чорні) з одним номером, як у записі
  партії (`1. e4 e5`).
- **SAN** (Standard Algebraic Notation) — `e4`, `Nbd7`, `O-O`, `exd5`, `e8=Q+`,
  `Qh5#`.
- **FEN** — рядок повної позиції (уже є `data/fenConstants.js`).
- **PGN** — текстовий формат партії: заголовки (`[White "..."]`) + список
  ходів у SAN.

## 4. Архітектурне рішення: своя логіка чи `chess.js`

Це ключове рішення, яке визначає решту документа.

**Рекомендація: підключити [`chess.js`](https://github.com/jhlywa/chess.js)**
(MIT, ~10 kB gzip, без залежностей) і використовувати його як джерело істини
для легальності ходів, шаху/мату/пату, `.san()` і `.pgn()`. Причини:

- SAN формально неможливо коректно згенерувати без повної генерації легальних
  ходів (дизамбігуація, "чи хід не залишає свого короля під шахом", шах/мат).
  Написання власного шахового двигуна — це окремий великий проєкт, не частина
  задачі "показати список ходів".
- `chess.js` дає `.moves({ verbose: true })`, `.move()`, `.san` останнього
  ходу, `.pgn()`, `.fen()`, `.in_check()`, `.in_checkmate()` — закриває
  одразу і легальність, і нотацію, і PGN.
- Поточний Redux-стан (`board` як `{a2:'P',...}`) легко співіснує з
  `chess.js`: він тримає власну internal-репрезентацію, з ним взаємодіємо
  через FEN/SAN, а `board`-об'єкт для рендеру дошки можна й далі похідно
  генерувати з `chess.js` FEN через уже наявний `fenConverter.js`.

**Альтернатива (без нової залежності):** писати власну легкозважену
нотацію без дизамбігуації "чи хід легальний за шахом" і без детекції
шаху/мату — тобто SAN-подібний, але не строгий формат (без суфіксів `+`/`#`,
без гарантії коректної дизамбігуації). Це швидше зробити, але результат не
є справжнім PGN і його не можна імпортувати в сторонні аналізатори без
подальшого допрацювання. Розділ 6 нижче описує саме цей "полегшений" алгоритм
— він придатний як перший крок / MVP, з чітким шляхом міграції на `chess.js`
пізніше (розділ 9, етап 3).

Далі документ описує модель даних та UI так, щоб вони працювали з **обома**
варіантами (легкий алгоритм зараз → `chess.js` пізніше без переписування UI).

## 5. Модель даних ходу

Замінюємо елемент `history` з `{from, to, piece}` на об'єкт з усім, що потрібно
для SAN, undo та PGN:

```js
// один елемент state.game.history
{
  ply: 1,                // 1-based номер напівходу (= plyCount ДО інкременту + 1)
  color: 'w',            // COLORS.WHITE | COLORS.BLACK
  from: 'e2',
  to: 'e4',
  piece: 'P',            // FEN-символ фігури, що ходила
  captured: null,        // FEN-символ з'їденої фігури або null
  promotion: null,       // 'Q' | 'R' | 'B' | 'N' | null
  castling: null,        // 'K' (коротка) | 'Q' (довга) | null
  enPassant: false,
  isCheck: false,
  isCheckmate: false,
  san: 'e4',             // готовий рядок нотації для відображення
  fenAfter: '...',       // FEN одразу після ходу (опційно, але дуже корисно для undo/перегляду)
  timestamp: 1737000000000, // Date.now() для майбутнього таймлайну/аналізу часу на хід
}
```

`captured` не можна отримати постфактум із `moveExecuted` (поточна редукція
затирає `state.board[to]` без збереження попереднього значення) — це треба
захопити **до** мутації дошки, всередині самого редюсера чи в `attemptMove`
до диспатчу.

## 6. Логіка формування SAN (легкий алгоритм, без `chess.js`)

Новий модуль `src/utils/notation.js`, чиста функція без побічних ефектів:

```js
/**
 * @param {object} ctx - { board (ДО ходу), from, to, piece, promotion }
 * @returns {string} SAN-рядок (без суфіксів +/#, див. нижче)
 */
export function toSAN({ board, from, to, piece, promotion, castling }) {
  if (castling === 'K') return 'O-O';
  if (castling === 'Q') return 'O-O-O';

  const captured = board[to];
  const isCapture = Boolean(captured);
  const pieceType = piece.toUpperCase(); // 'P','N','B','R','Q','K'

  const disambiguation = pieceType === 'P'
    ? ''
    : getDisambiguation({ board, from, to, piece });

  let notation = '';
  if (pieceType === 'P') {
    notation = isCapture ? `${from[0]}x${to}` : to;
  } else {
    notation = `${pieceType}${disambiguation}${isCapture ? 'x' : ''}${to}`;
  }

  if (promotion) notation += `=${promotion.toUpperCase()}`;
  return notation;
}
```

`getDisambiguation` — мінімальна версія без перевірки "залишає короля під
шахом" (чесно задокументувати це обмеження в коментарі й у розділі 4):

```js
function getDisambiguation({ board, from, to, piece }) {
  // Знаходимо інші свої фігури того ж типу, які геометрично можуть дійти
  // на `to` (без урахування шаху власному королю — обмеження легкої версії).
  const candidates = findSameTypeAttackers(board, to, piece).filter(
    (sq) => sq !== from
  );
  if (candidates.length === 0) return '';

  const sameFile = candidates.some((sq) => sq[0] === from[0]);
  const sameRank = candidates.some((sq) => sq[1] === from[1]);

  if (!sameFile) return from[0];       // досить літери файлу
  if (!sameRank) return from[1];       // досить цифри рангу
  return from;                          // потрібне повне поле
}
```

`isCheck` / `isCheckmate` (суфікси `+` / `#`) **свідомо не рахуються** в
легкій версії — вони вимагають повної детекції атак на короля суперника, що
по суті вже є шаховим двигуном. Показуємо SAN без цих суфіксів, доки не
перейдемо на `chess.js` (розділ 9).

Виклик у `gameOperations.js`, **до** диспатчу `moveExecuted` (поки `board`
ще в стані "до ходу"):

```js
const san = toSAN({ board: state.game.board, from, to, piece, promotion, castling });
dispatch(moveExecuted({ from, to, piece, captured, promotion, castling, san, ply: plyCount + 1 }));
```

## 7. Redux: зміни

- `gameSlice.moveExecuted`: приймає розширений payload (розділ 5), пушить
  готовий об'єкт у `history` замість сирого `{from,to,piece}`.
- Нові селектори в `gameSelectors.js`:
  ```js
  export const selectMoveHistory = (state) => state.game.history;

  // Групування в пари для рендеру "1. e4 e5"
  export const selectMovePairs = (state) =>
    state.game.history.reduce((pairs, move) => {
      if (move.color === COLORS.WHITE) {
        pairs.push({ number: pairs.length + 1, white: move, black: null });
      } else {
        pairs[pairs.length - 1].black = move;
      }
      return pairs;
    }, []);
  ```
- `selectCurrentTurn` не змінюється (все ще похідне від `plyCount`).

## 8. UI: компонент списку ходів

Новий компонент `src/components/MoveList/MoveList.jsx`, за тим самим
патерном container/view, що вже є в `ChessBoardContainer`:

```jsx
// MoveListContainer.jsx
const MoveListContainer = () => {
  const movePairs = useSelector(selectMovePairs);
  return <MoveListView movePairs={movePairs} />;
};

// MoveListView.jsx — чиста презентація
const MoveListView = ({ movePairs, onSelectPly }) => (
  <ol className="move-list">
    {movePairs.map(({ number, white, black }) => (
      <li key={number} className="move-list__row">
        <span className="move-list__num">{number}.</span>
        <button onClick={() => onSelectPly?.(white)}>{white?.san}</button>
        {black && <button onClick={() => onSelectPly?.(black)}>{black.san}</button>}
      </li>
    ))}
  </ol>
);
```

Розміщення: бічна панель поруч із дошкою (аналогічно `Clock`), автоскрол до
останнього ходу через `ref` + `scrollIntoView` при зміні `plyCount`.
`onSelectPly` — заділ під розділ 11 (перегляд історії), у MVP може бути
відсутнім (без onClick).

## 9. Збереження в `localStorage`

Поточна реалізація (`redux/store.js`) — робочий, але вразливий підхід:

```js
store.subscribe(() => {
  localStorage.setItem('chess_game_state', JSON.stringify(store.getState().game));
});
```

Проблеми й рекомендації:

1. **Пише на кожен `dispatch`, включно з тіком годинника (раз/сек).**
   → Дебаунсити запис (наприклад, `throttle` 1000 мс вже фактично збігається
   з тіком, але краще розділити: миттєвий запис на `moveExecuted`/`endGame`,
   і throttled запис (кожні ~5с) для `updateTime`, щоб не гамселити диск/квоту
   без потреби.
2. **Немає версії схеми.** Якщо завтра зміниться форма `history` (розділ 5),
   старий збережений стан із продакшену зламає додаток при `JSON.parse` +
   підстановці в Redux (поля не будуть відповідати очікуваним).
   → Зберігати обгортку:
   ```js
   const STORAGE_KEY = 'chessb:v1:game';
   const payload = { version: 1, state: store.getState().game };
   localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
   ```
   При завантаженні — перевіряти `version`; якщо не збігається з поточною —
   ігнорувати збережений стан (почати нову партію) замість краху.
3. **Немає обробки помилок при читанні** (лише запис обгорнутий в try/catch).
   Потрібна симетрична функція `loadPersistedGame()` з try/catch навколо
   `JSON.parse`, яка повертає `undefined` при будь-якій помилці (пошкоджені
   дані, quota-помилки, приватний режим браузера без доступу до
   `localStorage`).
4. **PGN не варто зберігати окремим рядком-дублікатом.** Джерело істини —
   масив `history` (розділ 5); PGN будується з нього на льоту (розділ 10).
   Дублювання = ризик розсинхронізації.
5. **Ключ спільний для "поточна партія" й потенційно "налаштування".** Якщо
   згодом з'явиться щось на кшталт збережених налаштувань UI — використати
   окремий ключ (`chessb:v1:settings`), не мішати в один об'єкт з ігровим
   станом.

Підсумкова структура ключа:

```js
localStorage['chessb:v1:game'] = JSON.stringify({
  version: 1,
  savedAt: Date.now(),
  state: { board, history, plyCount, whiteTime, blackTime, playerSide, gameId, winner, reason, isGameOver },
});
```

## 10. PGN: експорт/імпорт

Похідна функція (не зберігається, будується за запитом):

```js
// src/utils/pgn.js
export function buildPgn(history, meta = {}) {
  const headers = [
    `[Event "${meta.event ?? 'Casual game'}"]`,
    `[Date "${meta.date ?? new Date().toISOString().slice(0, 10)}"]`,
    `[White "${meta.white ?? 'Player'}"]`,
    `[Black "${meta.black ?? 'Player'}"]`,
    `[Result "${meta.result ?? '*'}"]`,
  ].join('\n');

  const movesText = movePairsToPgnBody(history); // "1. e4 e5 2. Nf3 Nc6 ..."
  return `${headers}\n\n${movesText} ${meta.result ?? '*'}`;
}
```

UI: кнопка "Копіювати PGN" / "Завантажити .pgn" у панелі списку ходів
(`navigator.clipboard.writeText` + `Blob` + посилання-завантаження). Це не
потребує нових залежностей і одразу дає сумісність із lichess/chess.com для
імпорту.

## 11. Undo / перегляд історії ходів

Два різні за складністю сценарії — варто розрізняти в майбутньому плануванні:

- **Перегляд минулої позиції (read-only, без зміни `plyCount`)**: клік по
  ходу в `MoveList` показує `fenAfter` цього ходу на дошці в окремому
  "viewing mode", не чіпаючи справжній ігровий стан. Найдешевше рішення:
  використовувати вже запропоноване поле `fenAfter` (розділ 5) +
  `fenConverter.js`, який уже є в проєкті.
- **Справжній undo (зміна ігрового стану)**: обрізати `history` до потрібного
  `ply`, відновити `board` з `fenAfter` попереднього ходу (або з
  `initialBoardPiecesObject`, якщо відкат до старту), відкоригувати
  `plyCount`. Складніше через годинники (скільки часу повернути гравцю?) —
  залишити поза MVP, окремим рішенням продукту, чи потрібен undo в грі з
  таймером взагалі (у змагальних шахах undo зазвичай відсутній).

## 12. Тестування

За прикладом наявного `boardUtils.test.js` — юніт-тести на чисті функції,
без Redux/React:

- `notation.test.js`: peшка на прохід, взяття пішака, рокіровка (обидві
  сторони), промоція, дизамбігуація по файлу / по рангу / по обох (три коні
  на одному діагональному доступі — рідкісний, але класичний edge case),
  звичайний тихий хід кожним типом фігури.
- `pgn.test.js`: коректні заголовки, порядок ходів, партія з непарною
  кількістю напівходів (білі зробили останній хід).
- Якщо оберете `chess.js` (розділ 4) — тести звужуються до **адаптера**
  (мапінг `chess.js` move → наш `history`-об'єкт), сам SAN/легальність вже
  протестовані в бібліотеці.

## 13. Поетапний план впровадження

1. **Модель даних + легкий SAN** (розділи 5–6): розширити `moveExecuted`,
   написати `notation.js`, покрити тестами. Ще без UI.
2. **UI списку ходів** (розділ 8) + **збереження з версією схеми** (розділ 9).
   Це вже дає гравцю видиму цінність.
3. **Міграція на `chess.js`** (розділ 4, альтернатива → рекомендація): він
   заміняє легкий `notation.js` і саму валідацію ходів у `gameOperations.js`,
   додає коректні шах/мат/пат і суфікси `+`/`#`. UI з кроку 2 не міняється —
   він читає `state.game.history[i].san`, байдуже, що саме його згенерувало.
4. **PGN експорт/копіювання** (розділ 10) — тривіальний, коли `history` вже
   має правильну форму.
5. (опційно) **Перегляд історії / undo** (розділ 11) — окреме продуктове
   рішення про UX під час гри з таймером.
