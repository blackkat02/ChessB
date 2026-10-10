# ChessB

Шаховий застосунок на **React 19 + Vite + Redux Toolkit**. Стан гри (позиція фігур, черга ходу, таймери, історія) зберігається в Redux і синхронізується з `localStorage`.

## Стек

- **React 19**, **React Router 7**
- **Redux Toolkit** + **React Redux** — стан гри
- **Vite 6** — збірка та dev-сервер
- **Tailwind CSS 4** — стилі
- **Vitest** + **Testing Library** — юніт-тести
- ESLint + Prettier

## Запуск

```bash
npm install
npm run dev        # dev-сервер Vite
npm run build      # продакшн-збірка
npm run preview    # перегляд продакшн-збірки
```

## Тести

Юніт-тести працюють на **Vitest** (середовище `jsdom`, глобальні `describe/it/expect`).
Конфігурація — у блоці `test` файлу `vite.config.js`, глобальний setup — `src/test/setup.js`
(підключає matcher-и `@testing-library/jest-dom`, напр. `toBeInTheDocument()`).

Тестові файли: `src/**/*.{test,spec}.{js,jsx}` — лежать поруч із кодом, який тестують
(`attacks.js` → `attacks.test.js`).

### Запуск усіх тестів

```bash
npm test           # разовий прогін (vitest run)
npm run test:watch # watch-режим: перезапуск при збереженні файлів
npm run test:ui    # UI Vitest у браузері
npm run coverage   # звіт покриття (провайдер v8): у терміналі + HTML у coverage/
```

### Запуск окремих файлів і папок

Аргументи після `--` передаються у Vitest. Фільтр — це **підрядок шляху** до файлу,
тому підходить і повний шлях, і папка, і частина назви.

```bash
# один файл
npm test -- src/engine/attacks.test.js

# частина назви файлу (усі файли, у шляху яких є "attacks")
npm test -- attacks

# уся папка
npm test -- src/engine            # рушій
npm test -- src/redux             # Redux: slice, thunk-и, селектори, persist, store
npm test -- src/components        # React-компоненти

# кілька файлів / папок за раз
npm test -- src/redux src/hooks

# watch-режим лише для одного файлу чи папки
npm run test:watch -- src/engine/applyMove.test.js
```

> Windows: шляхи можна писати і з `/`, і з `\` — Vitest нормалізує їх.

### Запуск окремих тестів за назвою

`-t` (`--testNamePattern`) відбирає тести, повна назва яких (усі вкладені `describe` + `it`)
містить заданий рядок. Решта позначаються як `skipped`.

```bash
npm test -- src/engine/attacks.test.js -t "кінь"   # лише блок describe('кінь')
npm test -- -t "рокіровка"                         # у всіх файлах
```

Тимчасово, прямо в коді (не комітити!):

```js
it.only('...', () => {});   // запускати лише цей тест у файлі (працює й describe.only)
it.skip('...', () => {});   // пропустити тест
it.todo('...');             // нагадування: тест ще треба написати
```

### Покриття окремої папки

```bash
npx vitest run src/engine --coverage --coverage.include="src/engine/**"
```

Без `--coverage.include` у звіт потраплять усі файли `src/`, і для не запущених тестів
покриття буде 0%.

### Тестові дані

Позиції в тестах — об'єкти дошки `{ e1: 'K', e8: 'k' }` прямо в `it`. Спільні фікстури
(права рокіровки, білдери стану, типові позиції й ходи) заплановано в `src/test/fixtures/`.
План і правила — `docs/test-fixtures.md`.

### Покриті модулі

| Модуль | Файл тестів | Що перевіряється |
|---|---|---|
| `engine/boardUtils.js` | `boardUtils.test.js` | `algebraicToCoords` / `coordsToAlgebraic`: кути та центр дошки, незалежність від регістру, валідація помилок, round-trip для всіх 64 клітинок |
| `engine/pieceGeometry.js` | `pieceGeometry.test.js` | Зміщення коня й короля, напрямки тури, слона, ферзя |
| `engine/pseudoMoves.js` | `pseudoMoves.test.js` | Псевдолегальні ходи всіх фігур: блокування, взяття, подвійний хід пішака, en passant |
| `engine/attacks.js` | `attacks.test.js` | `isSquareAttacked`: атаки кожної фігури, зупинка променя на першій фігурі, фільтр за кольором |
| `engine/legalMoves.js` | `legalMoves.test.js` | `filterByKingSafety` (зв'язки, вихід із шаху), `getCastlingMoves` (права, блокування, атаковані клітинки) |
| `engine/gameStatus.js` | `gameStatus.test.js` | `isCheck`, `getAllLegalMoves`, `isCheckmate`, `isStalemate` |
| `engine/promotion.js` | `promotion.test.js` | `requiresPromotion`, `isValidPromotionPiece`, `resolvePromotionPiece` |
| `engine/notation.js` | `notation.test.js` | `buildSan`: взяття, дизамбігуація, рокіровки, промоція, суфікси `+`/`#` |
| `engine/applyMove.js` | `applyMove.test.js` | `applyMove`, `nextCastlingRights`, `nextEnPassantTarget`, `getCastlingRookMove` |
| `redux/game/gameSlice.js` | `gameSlice.test.js` | `moveExecuted` (взяття, рокіровка, права, en passant, промоція, SAN, годинник, запис партії), `endGame` |
| `redux/game/gameOperations.js` | `gameOperations.test.js` | Thunk-и `attemptMove` (промоція) і `timeExpired` |
| `redux/game/gameSelectors.js` | `gameSelectors.test.js` | `selectMovePairs` (зокрема мемоізація), `selectClockRemaining` |
| `redux/persistGame.js` | `persistGame.test.js` | Збереження/читання `localStorage`: round-trip, версія схеми, битий JSON, помилки квоти |
| `redux/store.js` | `store.test.jsx` | Відновлення стану при старті, таймаут «flag on reconnect», що саме записується в `localStorage` |
| `hooks/useGameState.js` | `useGameState.test.jsx` | Сирі поля годинника, `handleTimeUp` |
| `components/Clock` | `Clock.test.jsx` | Формат часу, тік, одноразовий `onTimeUp`, очищення таймера, `visibilitychange` |
| `components/GameOverModal` | `GameOverModal.test.jsx` | Тексти для мату, пату й таймауту, кнопки «Нова гра» та «Переглянути дошку» |

## Структура

Три шари, залежності йдуть лише вниз: **UI → Redux → рушій**
(докладно — `docs/layer-separation.md`).

```
src/
├── components/, pages/, layouts/  # UI: лише селектори й thunk-и, без імпортів рушія
├── hooks/
│   └── useGameState.js        # обробка кліків → dispatch(thunk)
├── redux/                     # стан застосунку
│   ├── store.js               # store + підписка на збереження в localStorage
│   ├── persistGame.js         # читання/запис стану гри в localStorage (з версією схеми)
│   └── game/                  # slice, операції (thunks), селектори, константи
├── engine/                    # шахові правила: чисті функції, не знає про Redux/React
│   ├── index.js               # фасад — єдині двері в рушій
│   ├── applyMove.js           # (position, move) → { position, details }
│   ├── pieceGeometry.js       # зміщення та напрямки руху фігур
│   ├── pseudoMoves.js, legalMoves.js, attacks.js, gameStatus.js
│   ├── notation.js, promotion.js
│   ├── boardUtils.js          # нотація ↔ координати масиву
│   ├── chessHelpers.js        # колір фігури за FEN-символом
│   └── constants.js           # COLORS
├── data/
│   ├── fenConstants.js        # стандартні FEN-рядки
│   └── positions.js           # початкова позиція фігур з FEN
├── styles/                    # CSS-токени: примітиви → семантика → компоненти
├── utils/
│   ├── fenConverter.js        # FEN → об'єкт дошки { a1: 'R', ... }
│   └── getPieceSymbol.js      # FEN-символ → юнікод-гліф фігури
└── test/
    └── setup.js               # налаштування тестового середовища
```

Тести (`*.test.js`, `*.test.jsx`) лежать поруч із файлами, які перевіряють.

## Лінт та формат

```bash
npm run lint
npm run lint:fix
npm run format
```
