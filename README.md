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
Конфігурація — у блоці `test` файлу `vite.config.js`, глобальний setup — `src/test/setup.js`.

```bash
npm test           # разовий прогін
npm run test:watch # watch-режим
npm run test:ui    # UI Vitest у браузері
npm run coverage   # звіт покриття (провайдер v8)
```

Тестові файли: `src/**/*.{test,spec}.{js,jsx}` (поруч із кодом, який тестують).

### Покриті модулі

| Модуль | Файл тестів | Що перевіряється |
|---|---|---|
| `src/engine/boardUtils.js` | `src/engine/boardUtils.test.js` | `algebraicToCoords` / `coordsToAlgebraic`: кути та центр дошки, незалежність від регістру, валідація помилок, round-trip для всіх 64 клітинок |

## Структура

Три шари, залежності йдуть лише вниз: **UI → Redux → рушій**
(докладно — `docs/layer-separation.md`).

```
src/
├── components/, pages/, layouts/  # UI: лише селектори й thunk-и, без імпортів рушія
├── hooks/
│   └── useGameState.js        # обробка кліків → dispatch(thunk)
├── redux/                     # стан застосунку
│   ├── store.js               # store + збереження в localStorage (persistGame.js)
│   └── game/                  # slice, операції (thunks), селектори, константи
├── engine/                    # шахові правила: чисті функції, не знає про Redux/React
│   ├── index.js               # фасад — єдині двері в рушій
│   ├── applyMove.js           # (position, move) → { position, details }
│   ├── pseudoMoves.js, legalMoves.js, attacks.js, gameStatus.js
│   ├── notation.js, promotion.js
│   ├── boardUtils.js          # нотація ↔ координати масиву
│   ├── chessHelpers.js        # колір фігури за FEN-символом
│   └── constants.js           # COLORS
├── data/
│   ├── fenConstants.js        # стандартні FEN-рядки
│   └── positions.js           # початкова позиція фігур з FEN
├── utils/
│   ├── fenConverter.js        # FEN → об'єкт дошки { a1: 'R', ... }
│   └── getPieceSymbol.js      # FEN-символ → юнікод-гліф фігури
└── test/
    └── setup.js               # налаштування тестового середовища
```

## Лінт та формат

```bash
npm run lint
npm run lint:fix
npm run format
```
