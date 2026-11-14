# Roadmap

Що лишилось зробити. Єдине місце, де ведеться статус задач: інші документи
сюди посилаються, а не тримають власні чеклисти. Як влаштовано вже зроблене —
`docs/architecture.md`.

Оновлено: 2026-11-11. Легенда: ⬜ не почато · 🔄 у роботі · ✅ готово
(готові пункти видаляються з цього файлу й описуються в `architecture.md`).

## Правила

- Один пункт — один або кілька комітів, після кожного `npm test` зелений.
- Рефакторинг не змінює поведінку; знайдений по дорозі баг записується в
  розділ «Знахідки», а не виправляється заодно.
- Зміна форми збереженого стану піднімає `SCHEMA_VERSION` (наступна — 7).
- У документах не пишемо номери рядків і кількість тестів — лише назви
  функцій і `grep`-перевірки.

## Залежності

```
R1 selectLegalTargets ──► F1 підсвітка ходів
R2 тести через селектори ─┐
R3 прибирання кроку 4 ────┴► R4 межі шарів + ESLint
Q2 FEN ──► Q1 perft (Kiwipete), Q3 FEN-фікстури, F3 перегляд історії, F4 повторення
F3 перегляд історії ──► F5 undo (лише після продуктового рішення)
```

## Зараз: завершити рефакторинг шарів

### R1. `selectLegalTargets` 🔄

Замінити `selectIsFriendlyFire` і `selectIsMovePossible` одним мемоізованим
селектором над `getLegalMoves`. Задача й критерії —
`docs/livecoding-05-legal-targets.md` (розв'язок — `layer-separation-step4.md`
§4.5, не відкривати до сесії).

Готово, коли: `grep -rn "selectIsFriendlyFire\|selectIsMovePossible" src`
порожній, є тест на зв'язку і на `toBe`.

### R2. Тести читають стан через селектори ⬜

Підкрок 4.0 зроблено наполовину: `createTestStore` вкладений, але тести досі
читають `getState().game.*` напряму. Перевести на селектори; для полів без
селектора (`turnStartedAt`) — додати селектор.

Готово, коли: `grep -rn "getState()\.game" src --include=*.test.*` порожній.

### R3. Прибирання кроку 4 ⬜

- `gameSelectors.js` — лише селектори запису партії.
- Невикористані селектори в `positionSelectors.js` (`selectPieceAtSquare`,
  `selectIsSquareEmpty`, `selectPieceColorAt`, `selectIsOwnPiece`,
  `selectIsWhiteTurn`) — видалити або знайти їм споживача.
- `gameSlice.test.js` перевіряє лише запис партії.
- Закрити `layer-separation-step4.md` і перенести в `archive/`.

Готово, коли: `npx eslint src/redux` без `no-unused-vars`, перевірки з
`layer-separation-step4.md` §5 проходять.

### R4. UI без рушія, межі стереже ESLint ⬜

1. `useGameState.js` і `ChessBoardContainer.jsx` імпортують
   `getPieceColor`/`requiresPromotion` з `src/engine/*`. Замінити на
   селектори (наприклад, `selectNeedsPromotion(state, from, to)`,
   `selectIsOwnPieceAt`) або на `COLORS`-порівняння через Redux.
2. `useGameState.js` читає `state.game.turnStartedAt` інлайн → селектор.
3. `eslint.config.js` (flat config) — два блоки `no-restricted-imports`:
   - `files: ['src/engine/**']` — заборонити `**/redux/**`, `react`,
     `react-*`, `@reduxjs/*`;
   - `files: ['src/{components,hooks,pages,layouts}/**']` — заборонити
     `**/engine`, `**/engine/**`.
4. Перевірити правило навмисним тимчасовим порушенням.

Готово, коли: `npm run lint` зелений, а тимчасовий
`import { getLegalMoves } from '../../engine'` у компоненті його валить.

### R5. Прибрати debug-логи ⬜

`console.*` лишились у `gameOperations.js` і `useGameState.js` (трасування
валідації) та `SandBoxPage.jsx`. Видалити або звести до
`src/utils/debugLog.js` з прапорцем `import.meta.env.DEV`. Лишається
легітимний `console.error` у `persistGame.js`.

Готово, коли: `grep -rn "console\." src --include=*.js --include=*.jsx | grep -v test`
показує лише `persistGame.js` і `debugLog.js`.

### R6. Видалити `redux-persist` ⬜

Рішення ухвалене (власний `persistGame.js`), але залежність лишилась у
`package.json`, а в `main.jsx` — закоментований `PersistGate`.

Готово, коли: `grep -rn "redux-persist\|PersistGate" package.json src` порожній.

## Якість коду і зрозумілість (огляд 2026-11-11)

### C1. Дрібні помилки ESLint у компонентах ⬜

- `GameInfoPanel.jsx`: кнопки `Button` отримують `children={undefined}
  id={undefined}` поруч зі звичайним вкладеним текстом. Схоже на
  автогенерацію IDE: читача це плутає, а ESLint дає `react/no-children-prop`.
  Прибрати обидва пропи.
- `Square.jsx`, `Piece.jsx`: анонімна функція в `React.memo` → немає
  `displayName` (`react/display-name`). Оголосити іменовану функцію й
  обгорнути: `const Square = memo(function Square(...) {...})`.
- `Clock.jsx`, `SandBoxPage.jsx`: невикористаний `import React`.

Готово, коли: `npx eslint src/components src/pages | grep -v prettier`
не показує `no-children-prop`, `display-name` і `no-unused-vars`.

### C2. Коментарі пояснюють код, а не його історію ⬜

Частина коментарів розповідає, як було раніше, а не чому код такий зараз:
«Раніше тут була окрема `tickTimer`…» (`timeExpired` у
`gameOperations.js`), «як раніше, коли прапорець приходив…» (`moveExecuted`
у `gameSlice.js`), «виділення клітинки переїхало…». Історії місце в git і
`archive/`.

У `attemptMove` нумерація кроків поламана (3, 4, 6.5, 7, 8), бо частину
кроків видалили. Прибрати номери або розбити функцію на
`validateMove()` → `buildMovePayload()` → диспатч.

Посилання на `docs/archive/...` лишати лише там, де без них рішення
незрозуміле, і не більше одного на функцію.

Готово, коли: `grep -rn "Раніше\|як раніше\|переїхало" src` порожній, а в
`attemptMove` немає нумерованих кроків.

### C3. Розділити `useGameState` ⬜

Хук викликається двічі: у `HomePage` і в `ChessBoardContainer`. Кожен
виклик має власний `useState` для `pendingPromotion`, тож HomePage даремно
підписується на десяток селекторів, а промоція працює лише тому, що її
бере тільки `ChessBoardContainer`. Розділити:

- `useBoardInteraction` — `handleSquareClick`, `pendingPromotion`,
  `resolvePromotion`, `cancelPromotion` (споживач: `ChessBoardContainer`);
- `useGameInfo` — годинники, статус партії, `startNewGame`,
  `handleResign`, `handleOfferDraw` (споживач: `HomePage`).

Робити разом з R4 або після нього, щоб хуки одразу були без імпортів рушія.

Готово, коли: `grep -rn "useGameState" src` показує лише тест або
порожній; кожен новий хук має свій тест.

### C4. Стан читається лише через селектори ⬜

Розширює R4 п. 2 і знахідку про `isGameOver`: у thunk-ах
`gameOperations.js` трапляються `state.game.isGameOver`,
`state.game.whiteTime` / `blackTime`, а в `useGameState.js` інлайн
`(state) => state.game.turnStartedAt`. Селектори для цього вже є (або
додати `selectTurnStartedAt`).

Готово, коли: `grep -rn "state\.game\." src --include=*.js --include=*.jsx | grep -v test | grep -v Slice | grep -v Selectors`
порожній.

### C5. Мертві залежності й ім'я пакета ⬜

Не імпортуються ніде в `src`: `axios`, `formik`, `yup`,
`react-datepicker`, `react-modal`, `react-spinners`, `react-hot-toast`,
`react-icons`. Встановлено обидва плагіни `@vitejs/plugin-react` і
`@vitejs/plugin-react-swc`, у `vite.config.js` використовується лише
перший. `redux-persist` — окремо в R6. Ім'я пакета
`goit-neo-react-hw-module1` лишилось від домашнього завдання → `chessb`.

Перед видаленням перевірити кожну: `grep -rn "<назва>" src vite.config.js`.

Готово, коли: `npm uninstall` для переліченого, `npm run build` і
`npm test` зелені.

## Далі: якість рушія і тестів

### Q1. Perft ⬜

`src/engine/perft.test.js`: рекурсивний підрахунок вузлів через
`getAllLegalMoves` + `applyMove`. `turn` уже в позиції, тож колір окремим
аргументом не потрібен. Еталон зі стартової позиції: 20 / 400 / 8902 /
197281 (глибини 1–4). Після Q2 — Kiwipete з опублікованими числами.

Готово, коли: глибини 1–4 збігаються. Розбіжність шукати з найменшої
глибини, на якій вона з'являється.

### Q2. FEN в обидва боки ⬜

`src/engine/fen.js`: `fenToPosition(fen)` і `positionToFen(position,
counters)`, через фасад. Поля 1–4 → `position`; поле 6 — номер ходу для
запису партії; поле 5 — для правила 50 ходів (F4). `fenToBoardObject` з
`src/utils/fenConverter.js` переїжджає в рушій. `initialState` слайсу
`position` будується з `fenToPosition(STARTING_FEN)`.

Готово, коли: `positionToFen(fenToPosition(STARTING_FEN))` повертає
`STARTING_FEN`; є тест з ходом чорних і з `-` у полях 3–4.

### Q3. Решта фікстур ⬜

За `archive/test-fixtures.md` (розділи 3.3–3.6, кроки 5–8):

1. `withKings(pieces)` і `POSITIONS` (рокіровка, en passant, промоція,
   зв'язка, мат, пат) — лише позиції, що трапляються у 2+ файлах. Вирішити:
   заморожені об'єкти чи фабрики.
2. `MOVES` (рокіровки, `E2_E4`…) для `applyMove.test.js`.
3. `GAMES` в UCI + `playMoves(store, moves)` через `attemptMove` →
   інтеграційні тести (дитячий мат, партія з рокіровкою та en passant).
4. Після Q2: повні позиції у FEN і round-trip для всіх `POSITIONS`.

Готово, коли: кількість тестів після п. 1–2 не змінилась; інтеграційні
тести з п. 3 падають зі зрозумілим повідомленням на нелегальному ході.

### Q4. Компонентні тести ⬜

Є лише `Clock` і `GameOverModal`. Пріоритет: `PromotionModal` (вибір фігури
→ правильна літера), `NewGameModal` (час, сторона, random),
`ChessBoardView`/`Square` (рендер, розворот, вибір). Для послідовностей дій
— `@testing-library/user-event`.

Готово, коли: кожен з цих компонентів має тест на рендер і на основну
взаємодію.

### Q5. E2E (Playwright) ⬜

Мінімум: хід кліками, промоція через модалку, скріншот `HomePage` на
375 / 768 / 1280 px. Закриває прогалину «UI перевірявся лише вручну».

Готово, коли: `npx playwright test` проходить локально.

## Фічі

### F1. Підсвітка легальних ходів ⬜

Після R1. `ChessBoardContainer` бере `selectLegalTargets`, `Square` отримує
проп «можна піти сюди» (точка; кільце — на взятті). Один селектор на всю
дошку, а не 64 виклики з аргументом.

### F2. PGN-експорт ⬜

`src/utils/pgn.js` (`buildPgn(history, meta)`, дизайн —
`archive/move-notation.md` §10), групування — через `selectMovePairs`.
Кнопка в `MoveListView`: копіювати / завантажити `.pgn`. Опційно —
`{[%clk H:MM:SS]}` з `clockAfter`.

Готово, коли: PGN імпортується на lichess.org без помилок.

### F3. Перегляд історії (read-only) ⬜

Після Q2. `fenAfter` у записі ходу (рахує thunk через рушій, `SCHEMA_VERSION`
→ 7). `ui.viewingPly: number | null`; селектор показує
`viewingPly === null ? position : fenToPosition(history[viewingPly].fenAfter)`.
Клік по ходу в `MoveList` — перегляд, клік по останньому — назад у гру.

### F4. Нічиї ⬜

Три незалежні частини (FIDE 9.2, 9.3, 9.6):

1. **50 ходів.** `position.halfmoveClock`, рахує `applyMove`: 0 після ходу
   пішака або взяття (рокіровка не скидає). ≥ 100 напівходів — нічия на
   вимогу, ≥ 150 — автоматично (`reason: 'fifty-move'`); мат важливіший.
2. **Повторення.** Ключ позиції — функція рушія: `board`, `turn`,
   `castlingRights` і `enPassantTarget` **лише якщо взяття на проході
   справді можливе** (інакше `null`), без лічильників. Список ключів — у
   `game`. Шукати назад досить на `halfmoveClock` напівходів. 3 рази — на
   вимогу, 5 — автоматично. Деталі й приклад — `archive/next-steps.md`, крок 7.
3. **Недостатність матеріалу** — `K-K`, `K+N-K`, `K+B-K`, однокольорові
   слони; у `gameStatus.js`.

### F5. Undo ⬜

Не починати без продуктового рішення: чи потрібен undo у грі з годинником.
Технічно — після F3 (обрізання `history`, відновлення позиції й часу).

### F6. Старт з довільного FEN ⬜

Після Q2. `newGameStarted` несе позицію; запис партії починається з номера
з поля 6 і з `1...`, якщо ходять чорні (`selectMovePairs` має це врахувати).

## Опційно

- `fast-check`: інваріанти випадкових партій (по одному королю, кількість
  фігур не зростає, жоден легальний хід не лишає короля під шахом). Після Q1.
- a11y: `role="dialog"` і фокус у трьох модалках, `jest-axe`.
- Мультиплеєр, турніри, сервер — `docs/chess-multiplayer.md` (draft).

## Знахідки (записано, не виправлено)

- **Модалка промоції на нелегальний хід.** `handleSquareClick` у
  `useGameState.js` відкриває модалку, щойно `requiresPromotion(piece, to)`
  повертає true. Але ця функція перевіряє лише, що це пішак і що ціль на
  останній горизонталі, а легальність ходу не перевіряє. Відтворення:
  виділити пішака на e7, клікнути a8 → модалка відкривається, після вибору
  фігури `attemptMove` мовчки відхиляє хід. Виправлення: відкривати модалку
  лише коли хід легальний (`isMoveLegal` через селектор, після R1 —
  `selectLegalTargets`). Потрібен тест у `useGameState.test.jsx`.

- **`turnStartedAt` у режимі аналізу.** Після кінця партії `moveExecuted`
  ставить `turnStartedAt = timestamp`, хоча годинники зупинені. Нешкідливо,
  бо `selectClockRemaining` перевіряє `isGameOver`, але стан суперечливий.
  Виправлення: не чіпати годинники, коли `payload.analysis === true`.
- **Аналіз після будь-якого кінця партії.** `attemptMove` пускає вільні
  ходи після мату, здачі, нічиї й таймауту, а `selectLegalTargets`
  показуватиме лише легальні. Вирішити разом з F1.
- **`gameOperations.js` читає `state.game.isGameOver` напряму** у
  `timeExpired`, `resignGame`, `offerDraw` — перевести на `selectIsGameOver`
  разом з R2.
