# Live coding #6: підсвітка легальних ходів

Дата: 2026-11-14. Тренування live coding на реальному коді проєкту.
Обсяг: пункт F1 з `docs/roadmap.md`, розбитий на дрібні кроки.
Попередня сесія: `livecoding-05-legal-targets.md` (селектор
`selectLegalTargets`, на якому стоїть ця задача).

## Формат

- **40–60 хвилин**, таймер видимий.
- **Думаєш уголос.** Мовчазні 5 хвилин — гірше, ніж неправильна ідея,
  сказана вголос.
- **Тест спершу.** Кроки 1 і 5 починаються з червоного тесту.
- Можна: документація React, Testing Library, Vitest, MDN, власний код
  проєкту. Не можна: AI-асистенти.
- Коміт після кожного зеленого кроку.

Старт:

```sh
git switch -c live/move-highlight
npm test        # усе зелене ДО початку
```

## Умова (читається вголос на старті)

> Коли гравець вибирає фігуру, клітинка підсвічується, але не видно, куди
> фігура може піти. Селектор `selectLegalTargets` уже повертає список цих
> клітинок, але його ніхто не використовує.
>
> Покажи легальні ходи на дошці:
>
> - на порожній клітинці, куди можна піти, — **точка** посередині;
> - на клітинці з фігурою суперника, яку можна взяти, — **кільце** по краю;
> - нічого не вибрано — жодних позначок.
>
> Логіка гри не змінюється: клік працює так само, як і раніше.

## Що вже є (прочитай до початку)

Ланцюжок компонентів дошки:

```
ChessBoardContainer   бере дані зі store через useSelector
        │  props
        ▼
ChessBoardView        будує 64 клітинки в циклі
        │  props (для кожної клітинки окремо)
        ▼
Square                малює одну клітинку
```

Подивись, як туди вже доходить вибрана клітинка — твоя задача влаштована
так само:

| Де | Як зроблено для вибраної клітинки |
|---|---|
| `ChessBoardContainer` | `const selectedSquare = useSelector(selectSelectedSquare);` |
| `ChessBoardView` | приймає `selectedSquare` (рядок `'e2'`), у циклі: `isSelected={selectedSquare === squareId}` |
| `Square` | приймає `isSelected` (булеан), додає клас за умовою |

**Головна різниця:** `selectedSquare` — це **один рядок**, тому
порівнюємо через `===`. `legalTargets` — це **масив рядків**
(`['e3', 'e4']`). Масив з рядком через `===` не порівнюють:
`['e3', 'e4'] === 'e3'` завжди `false`.

## Дані, з якими працюємо

```js
// що повертає selectLegalTargets — масив клітинок
const legalTargets = ['e3', 'e4', 'd5'];

// дошка — об'єкт, як у src/practice/board.js
const board = { e2: 'P', d5: 'p', e8: 'k', e1: 'K' };
```

Для кожної з 64 клітинок треба відповісти на одне питання: **яку позначку
тут малювати?** Відповідей три:

| Клітинка в `legalTargets`? | Фігура на клітинці є? | Позначка | Значення |
|---|---|---|---|
| ні | будь-що | немає | `null` |
| так | ні | точка | `'move'` |
| так | так | кільце | `'capture'` |

Для даних вище: `e3` → `'move'`, `d5` → `'capture'`, `e2` → `null`,
`a1` → `null`.

---

## Кроки

Кожен крок маленький. Не переходь до наступного, поки поточний не зелений.

### Крок 0. Розминка: `includes` (2 хв)

Відкрий консоль браузера або `node` і перевір руками:

```js
['e3', 'e4'].includes('e4');   // ?
['e3', 'e4'].includes('a1');   // ?
[].includes('e4');             // ?
```

Скажи вголос: що повертає `includes` — число, рядок чи булеан?

### Крок 1. Чиста функція `getTargetMark` (основний крок, ~15 хв)

Вся робота зі списком — тут. Функція не знає нічого про React: отримує
дані, повертає рядок або `null`. Тестується так само, як `src/practice`.

**1.1.** Створи файл `src/components/ChessBoardView/targetMark.js`:

```js
// Яку позначку легального ходу малювати на клітинці squareId.
// Повертає 'move', 'capture' або null.
export function getTargetMark(legalTargets, board, squareId) {
  // TODO
}
```

**1.2.** Створи файл тестів `src/components/ChessBoardView/targetMark.test.js`
і скопіюй туди готові тести:

```js
import { describe, it, expect } from 'vitest';
import { getTargetMark } from './targetMark';

const board = { e2: 'P', d5: 'p', e1: 'K', e8: 'k' };
const legalTargets = ['e3', 'e4', 'd5'];

describe('getTargetMark', () => {
  it('порожня легальна клітинка — точка', () => {
    expect(getTargetMark(legalTargets, board, 'e3')).toBe('move');
  });

  it('легальна клітинка з фігурою — кільце', () => {
    expect(getTargetMark(legalTargets, board, 'd5')).toBe('capture');
  });

  it('клітинки немає в списку — null', () => {
    expect(getTargetMark(legalTargets, board, 'a1')).toBe(null);
  });

  it('клітинки немає в списку, хоч на ній є фігура — null', () => {
    expect(getTargetMark(legalTargets, board, 'e2')).toBe(null);
  });

  it('порожній список — null для будь-якої клітинки', () => {
    expect(getTargetMark([], board, 'e3')).toBe(null);
  });
});
```

**1.3.** Запусти — усі 5 тестів мають бути **червоні**:

```sh
npx vitest src/components/ChessBoardView/targetMark.test.js
```

**1.4.** Напиши тіло функції. Порядок думок:

1. Якщо `squareId` **немає** в `legalTargets` — що повертаємо?
2. Якщо є, і на `board[squareId]` стоїть фігура — що повертаємо?
3. Інакше — що повертаємо?

Три `return`, дві умови. Нічого не імпортуй.

**1.5.** Усі 5 тестів зелені → коміт:

```
feat(ui): add getTargetMark helper
```

### Крок 2. `ChessBoardView`: масив у пропах, позначка в кожну клітинку (~10 хв)

Тут чотири точкові зміни у `src/components/ChessBoardView/ChessBoardView.jsx`.

**2.1. Імпорт** — нагорі файлу:

```js
import { getTargetMark } from './targetMark';
```

**2.2. Новий проп** — додай `legalTargets` у деструктуризацію параметрів
(поруч із `selectedSquare`). **Без** значення за замовчуванням
(`legalTargets = []` — ні; чому — питання №3 після сесії).

**2.3. У циклі** — для кожної клітинки порахуй позначку і передай її в
`Square`. Зараз у циклі є `squareId`, а дошка — у `boardPiecesObject`:

```jsx
<Square
  ...
  isSelected={selectedSquare === squareId}
  targetMark={/* виклик getTargetMark з трьома аргументами */}
  onClick={onClick}
/>
```

Зверни увагу: у `Square` йде **рядок або `null`**, а не весь масив.

**2.4. Залежності `useMemo`** — у кінці `useMemo(() => { ... }, [ ... ])`
стоїть масив того, від чого залежать клітинки. Додай туди `legalTargets` і
`boardPiecesObject`. Без цього позначки не оновляться, коли вибереш іншу
фігуру.

**2.5. `propTypes`** — внизу файлу:

```js
legalTargets: PropTypes.arrayOf(PropTypes.string).isRequired,
```

`PropTypes.string` тут не підходить: це масив рядків, а не рядок.

Тести поки не запускаємо — `Square` ще не вміє малювати. Переходь до кроку 3.

### Крок 3. `Square`: намалювати позначку (~10 хв)

`src/components/Square/Square.jsx`.

**3.1. Проп** — додай `targetMark` у деструктуризацію параметрів.

**3.2. Колір** — у `src/styles/3-components.css` два рядки за зразком
`square-selected`:

- у розділі `/* ── Square ── */`, після `--c-square-selected-inset`:
  ```css
  --c-square-target-bg: rgba(0, 0, 0, 0.22);
  ```
- нижче, після `--color-square-selected: ...`:
  ```css
  --color-square-target: var(--c-square-target-bg);
  ```

Тепер у Tailwind є класи `bg-square-target` і `border-square-target`.

**3.3. Розмітка** — перед рядком `{pieceType && <Piece type={pieceType} />}`
додай два блоки. Перший — точка:

```jsx
{targetMark === 'move' && (
  <span
    data-testid="move-target"
    className="pointer-events-none absolute h-1/4 w-1/4 rounded-full bg-square-target"
  />
)}
```

Другий — кільце. Напиши сам за зразком першого:

- умова: `targetMark === 'capture'`;
- `data-testid="capture-target"`;
- класи: `pointer-events-none absolute inset-0.5 rounded-full border-4 border-square-target`.

`inset-0.5` — розтягнути на всю клітинку з маленьким відступом;
`border-4` — товста рамка; фону немає, тому видно фігуру всередині.

### Крок 4. `ChessBoardContainer`: підключити селектор (~5 хв)

`src/components/ChessBoardContainer/ChessBoardContainer.jsx`, три рядки за
зразком `selectedSquare`:

1. імпорт `selectLegalTargets` з `'../../redux/game/gameSelectors'`;
2. `const legalTargets = useSelector(selectLegalTargets);`
3. проп `legalTargets={legalTargets}` у `<ChessBoardView ... />`.

Перевір у браузері: `npm run dev`, клікни пішака e2 → точки на e3 і e4.
Клікни коня g1 → точки на f3 і h3, а на e3/e4 зникли.

Усе працює → коміт:

```
feat(ui): highlight legal move targets
```

### Крок 5. Тест `ChessBoardView` (~10 хв)

Файл `src/components/ChessBoardView/ChessBoardView.test.jsx`. Перший тест
готовий, другий і третій допиши сам:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChessBoardView from './ChessBoardView';

describe('ChessBoardView — позначки ходів', () => {
  it('дві порожні легальні клітинки — дві точки, жодного кільця', () => {
    render(
      <ChessBoardView
        boardPiecesObject={{ e2: 'P' }}
        selectedSquare="e2"
        legalTargets={['e3', 'e4']}
        onClick={vi.fn()}
      />
    );

    expect(screen.queryAllByTestId('move-target')).toHaveLength(2);
    expect(screen.queryAllByTestId('capture-target')).toHaveLength(0);
  });

  it('легальна клітинка з фігурою — одне кільце', () => {
    // дошка: білий пішак e4, чорний пішак d5; legalTargets: ['e5', 'd5']
    // очікування: скільки точок? скільки кілець?
  });

  it('нічого не вибрано — жодної позначки', () => {
    // legalTargets: []
  });
});
```

`queryAllByTestId` повертає **масив** знайдених елементів (може бути
порожній). Тому перевіряємо його довжину — `toHaveLength(n)`.

### Крок 6. Фінальна перевірка

```sh
npm test
npx eslint src/components
git diff        # немає console.log і закоментованого коду
```

Коміт:

```
test(ui): cover legal move markers in ChessBoardView
```

### Крок 7 (stretch). Масив → об'єкт: селектор `selectTargetMarks`

Лише після того, як кроки 1–6 зелені й закомічені.

**Ідея.** Зараз кожна з 64 клітинок питає `getTargetMark`, і та щоразу
шукає в масиві через `includes`. Можна один раз перетворити масив на
об'єкт у тому ж форматі, що дошка:

```js
// було — масив від selectLegalTargets
['e3', 'e4', 'd5']

// стане — об'єкт: ключ — клітинка, значення — позначка
{ e3: 'move', e4: 'move', d5: 'capture' }
```

Тоді клітинка просто читає свій ключ: `targetMarks[squareId]`. Якщо ключа
немає — `undefined`, а `?? null` перетворить його на `null`.

`selectLegalTargets` **не змінюємо**: він відповідає на шахове питання
«куди можна піти» і лишається масивом. Новий селектор будується поверх нього.

**7.1. Чиста функція `buildTargetMarks`** — у `targetMark.js`, поруч із
`getTargetMark`:

```js
// ['e3', 'd5'] + дошка → { e3: 'move', d5: 'capture' }
export function buildTargetMarks(legalTargets, board) {
  // TODO
}
```

Тести — допиши в `targetMark.test.js` (не забудь додати `buildTargetMarks`
в імпорт):

```js
describe('buildTargetMarks', () => {
  it('порожні клітинки — усі move', () => {
    expect(buildTargetMarks(['e3', 'e4'], { e2: 'P' })).toEqual({
      e3: 'move',
      e4: 'move',
    });
  });

  it('клітинка з фігурою — capture', () => {
    expect(buildTargetMarks(['e5', 'd5'], { e4: 'P', d5: 'p' })).toEqual({
      e5: 'move',
      d5: 'capture',
    });
  });

  it('порожній список — порожній об\'єкт', () => {
    expect(buildTargetMarks([], { e2: 'P' })).toEqual({});
  });
});
```

Запусти — три червоні. Потім напиши тіло. Два способи, обери один і скажи
вголос, чому:

- **цикл:** `const marks = {};` → `for (const square of legalTargets)` →
  `marks[square] = ...` → після циклу `return marks;`
- **`reduce`:** як `selectMovePairs` у `gameSelectors.js`, тільки
  початкове значення не `[]`, а `{}`.

Значення для кожної клітинки — те саме правило, що в `getTargetMark`:
фігура є → `'capture'`, інакше → `'move'`. Зверни увагу: перевіряти
`includes` тут **не треба**. Чому?

**7.2. Селектор `selectTargetMarks`** — у `gameSelectors.js`, під
`selectLegalTargets`:

```js
export const selectTargetMarks = createSelector(
  [/* два селектори: список ходів і дошка */],
  /* функція з 7.1 — її можна передати прямо, без обгортки */
);
```

`selectBoard` імпортуй з `'../position/positionSelectors'`, а
`buildTargetMarks` — з `'../../components/ChessBoardView/targetMark'`.

Тести — у `gameSelectors.test.js`, новий `describe('selectTargetMarks')`:

1. стан: дошка `{ e1: 'K', e2: 'P', d3: 'p', e8: 'k' }`, вибрано `'e2'` →
   `{ e3: 'move', e4: 'move', d3: 'capture' }`;
2. нічого не вибрано → `{}`;
3. той самий стан двічі → той самий об'єкт (`toBe`).

Стан будуй так само, як у тестах `selectLegalTargets`.

**7.3. Переключити UI на об'єкт:**

1. `ChessBoardContainer`: `selectLegalTargets` → `selectTargetMarks`,
   проп `targetMarks={targetMarks}` замість `legalTargets`.
2. `ChessBoardView`: проп `targetMarks` замість `legalTargets`; у циклі
   `targetMark={targetMarks[squareId] ?? null}`; оновити залежності
   `useMemo` і `propTypes` (`PropTypes.object.isRequired`).
3. `getTargetMark` тепер ніхто не викликає → видали її і її тести.
4. Тести кроку 5 передають `legalTargets` — перепиши їх на `targetMarks`
   (наприклад, `{ e3: 'move', e4: 'move' }`).
5. `npm test`, `npx eslint src`, коміт:
   ```
   refactor(ui): compute legal move marks once in selectTargetMarks
   ```

**7.4 (навчальна вправа). Взяття на проході й рокіровка.**

Зараз `buildTargetMarks` дивиться лише на дошку, і є два особливі ходи:

| Хід | Що повертає рушій | Що на клітинці | Що покаже `buildTargetMarks` | Правильно? |
|---|---|---|---|---|
| рокіровка | клітинку, куди стає **король** (`g1` / `c1`) | порожньо (рушій це перевіряє) | `'move'`, точка | ✅ |
| взяття на проході | клітинку, куди стає **пішак** (`d6`) | порожньо | `'move'`, точка | ❌ це взяття, має бути кільце |

**Рокіровка:** окремого коду не треба. Точка на `g1` — так само
показують lichess і chess.com. Напиши тест, який це фіксує: король `e1`,
тура `h1`, `castlingRights: { whiteShort: true }`, вибрано `'e1'` → у
результаті є `g1: 'move'`.

**Взяття на проході:** потрібні ще два дані:

1. `enPassantTarget` з позиції — клітинка, де можна взяти на проході;
2. **яка фігура ходить.** Це важливо: якщо `enPassantTarget` — `e3`, а
   вибрано **коня**, який теж може піти на `e3`, — для коня це звичайний
   хід, не взяття. Кільце — лише коли ходить пішак.

Тобто правило стає таким:

```
є фігура на клітинці                              → 'capture'
клітинка === enPassantTarget і ходить пішак       → 'capture'
інакше                                            → 'move'
```

Що треба змінити (без готового коду):

- `buildTargetMarks` отримує більше аргументів. Які саме, і в якому
  порядку? Порада: передай один об'єкт позиції, а не окремо `board` і
  `enPassantTarget`.
- `selectTargetMarks`: у масиві вхідних селекторів тепер три —
  список ходів, позиція і вибрана клітинка. Фігуру, що ходить, візьмеш з
  дошки за вибраною клітинкою.
- Як дізнатися, що фігура — пішак, якщо вона може бути `'P'` або `'p'`?
  (Згадай `toUpperCase` з `src/practice`.)

Тести (спершу червоні):

У кожній позиції ще королі `e1: 'K'` і `e8: 'k'`.

1. білий пішак `e5`, чорний пішак `d5`, `enPassantTarget: 'd6'`, вибрано
   `'e5'` → `{ e6: 'move', d6: 'capture' }`;
2. **той самий** `enPassantTarget`, але замість пішака білий кінь на `c4`,
   вибрано `'c4'` → у результаті `d6: 'move'` (перевір лише цей ключ:
   `expect(marks.d6).toBe('move')`);
3. рокіровка з таблиці вище → `expect(marks.g1).toBe('move')`.

**Питання до кроку 7:**

- Що тепер рахується один раз, а що 64 рази? Порівняй з кроком 2.
- Чому `buildTargetMarks` не потребує `includes`, а `getTargetMark` —
  потребувала?
- Чи помітить гравець різницю у швидкості? Тоді навіщо цей крок?

## Критерії приймання

1. `getTargetMark` повертає `'move'`, `'capture'` або `null`; 5 тестів
   кроку 1 зелені.
2. Вибрана фігура → точки на порожніх легальних клітинках, кільця на
   взяттях. Без вибору позначок немає.
3. `selectLegalTargets` викликається **один раз** на всю дошку (у
   `ChessBoardContainer`), а не в кожній з 64 клітинок.
4. `Square` отримує `targetMark` (рядок або `null`), а **не** весь масив.
5. Колір позначки — через токен у `3-components.css`.
6. Тести кроку 5 (три штуки) зелені; `npm test` зелений;
   `npx eslint src/components` без нових помилок.
7. Ти можеш пояснити, чому `Square` отримує рядок, а не масив.

## Орієнтовний таймлайн

| Хвилини | Що                                                   |
| ------- | ---------------------------------------------------- |
| 0–5     | Умова, «Що вже є», крок 0                            |
| 5–20    | Крок 1: `getTargetMark` + тести                      |
| 20–30   | Крок 2: `ChessBoardView`                             |
| 30–40   | Кроки 3–4: `Square`, контейнер, перевірка в браузері |
| 40–50   | Крок 5: тести `ChessBoardView`                       |
| 50–55   | Крок 6, коміт, питання після сесії                   |

Якщо на 20-й хвилині крок 1 ще червоний — скажи це вголос. Кроки 1–4 —
обов'язкові, 5 можна перенести.

## Підказки

Відкривай по одній, лише якщо застряг більше ніж на 3 хвилини.

<details>
<summary>Підказка 1 (крок 1): перша умова</summary>

«Клітинки **немає** в списку» — це `includes`, перед яким стоїть `!`.
Порівняй з `if (!from) return [];` у `selectLegalTargets`: та сама форма
«ранній вихід».

</details>

<details>
<summary>Підказка 2 (крок 1): «на клітинці є фігура»</summary>

`board[squareId]` — це `'P'`, `'p'` тощо, або `undefined`, якщо клітинка
порожня (порожніх ключів у дошці немає, пам'ятаєш `src/practice`?).
`if (board[squareId])` — `true` лише коли фігура є.

</details>

<details>
<summary>Підказка 3 (крок 2): виклик у циклі</summary>

Аргументи в тому ж порядку, що в оголошенні функції: спершу масив, потім
дошка, потім клітинка. Дошка в `ChessBoardView` називається
`boardPiecesObject`.

</details>

<details>
<summary>Підказка 4 (крок 5): тест з кільцем</summary>

Скопіюй перший тест і зміни три речі: `boardPiecesObject`, `selectedSquare`,
`legalTargets`. Потім порахуй по таблиці з розділу «Дані»: `e5` порожня —
що там? `d5` з фігурою — що там?

</details>

## Stretch (якщо лишився час)

- Взяття на проході: пішак б'є на **порожню** клітинку. Що покаже
  `getTargetMark` — точку чи кільце? Додай тест, що фіксує поточну поведінку,
  і запиши проблему в `docs/roadmap.md`, розділ «Знахідки». Не виправляй.
- Тест на `Square`: клік по клітинці з позначкою все ще викликає `onClick`
  з `id` (`fireEvent.click` з `@testing-library/react`).

---

## Для ментора

Розділ нижче кандидат не читає до кінця сесії. Ключ складено за кодом станом
на 2026-11-14. Перевірено запуском: `getTargetMark` з ключа проходить тести
кроку 1; `ChessBoardView` рендериться в jsdom. Кроки 2–5 цілком запуском не
перевірялися.

<details>
<summary>Ключ: що має змінитися</summary>

- `targetMark.js`:
  ```js
  export function getTargetMark(legalTargets, board, squareId) {
    if (!legalTargets.includes(squareId)) return null;
    if (board[squareId]) return 'capture';
    return 'move';
  }
  ```
- `ChessBoardView.jsx`: імпорт; проп `legalTargets`;
  `targetMark={getTargetMark(legalTargets, boardPiecesObject, squareId)}`;
  `legalTargets` і `boardPiecesObject` у залежностях `useMemo` (можна
  замість `getPieceAtSquareId` — він уже залежить від `boardPiecesObject`);
  `propTypes`.
- `Square.jsx`: проп `targetMark`, два `span` з кроку 3.
- `3-components.css`: два токени з кроку 3.2.
- `ChessBoardContainer.jsx`: `useSelector(selectLegalTargets)` → проп.
- Крок 7 (перевірено запуском):
  ```js
  export function buildTargetMarks(legalTargets, board) {
    return legalTargets.reduce((marks, square) => {
      marks[square] = board[square] ? 'capture' : 'move';
      return marks;
    }, {});
  }

  export const selectTargetMarks = createSelector(
    [selectLegalTargets, selectBoard],
    buildTargetMarks
  );
  ```
  Крок 7.4 (перевірено запуском на трьох тестах з документа):
  ```js
  export function buildTargetMarks(legalTargets, position, from) {
    const { board, enPassantTarget } = position;
    const isPawn = from ? board[from].toUpperCase() === 'P' : false;
    return legalTargets.reduce((marks, square) => {
      const isEnPassant = isPawn && square === enPassantTarget;
      marks[square] = board[square] || isEnPassant ? 'capture' : 'move';
      return marks;
    }, {});
  }
  // createSelector([selectLegalTargets, selectPosition, selectSelectedSquare], buildTargetMarks)
  ```
  Пастки 7.4: забута перевірка «ходить пішак» (тест з конем червоний);
  `board[from].toUpperCase()` без перевірки `from` — падає, коли нічого не
  вибрано (тоді `legalTargets` порожній, але `isPawn` рахується раніше).
  Сильна відповідь на «навіщо»: не швидкість, а одна відповідь, порахована
  один раз, і місце, де згодом можна врахувати `enPassantTarget` (взяття
  на проході), бо селектор бачить усю позицію. Пастка: `includes` усередині
  `buildTargetMarks` — зайвий, бо ми й так ідемо лише по легальних
  клітинках. Червоний прапорець: змінити `selectLegalTargets`, щоб він
  повертав об'єкт.
- Коміти: `feat(ui): add getTargetMark helper`,
  `feat(ui): highlight legal move targets`,
  `test(ui): cover legal move markers in ChessBoardView`.

</details>

<details>
<summary>Ключ: пастки</summary>

**`===` замість `includes`.** `legalTargets === squareId` — масив з
рядком, завжди `false`, позначок немає. Тести кроку 1 це ловлять одразу.
Типова помилка, якщо копіювати рядок з `isSelected`.

**`PropTypes.string` для масиву.** Попередження в консолі під час тестів
(`Invalid prop legalTargets of type array, expected string`).

**Невідповідність назв пропів.** `ChessBoardView` передає `isTarget`, а
`Square` читає `targetMark` → `undefined`, позначок немає, помилки немає.
Ловиться тестом кроку 5.

**Масив у кожну клітинку.** `legalTargets={legalTargets}` у `Square` і
`includes` всередині. Працює, але порушує критерій 4: при кожній зміні
вибору новий масив → `React.memo` перемальовує **всі 64** клітинки замість
кількох.

**`useSelector` у `Square`.** 64 підписки на store. Червоний прапорець.

**Дефолт `legalTargets = []`.** Новий масив на кожен рендер → `useMemo`
перераховує клітинки щоразу.

**Перевірка кольору в `getTargetMark`.** Зайве: рушій не пускає на свої
фігури. Та сама помилка, що старі селектори з сесії #5.

**Взяття на проході.** Ціль порожня → точка. Норма, якщо назване (stretch).

</details>

<details>
<summary>Рубрика оцінювання</summary>

|                 | 1 — слабко                   | 2 — норм                    | 3 — сильно                                                |
| --------------- | ---------------------------- | --------------------------- | --------------------------------------------------------- |
| **Комунікація** | мовчить                      | коментує дії                | перед кожним кроком каже, що зміниться і що впаде         |
| **Масиви**      | `===` з масивом              | `includes` з підказкою      | `includes` сам; пояснює, що він повертає                  |
| **Тести**       | не запускав червоними        | запускав                    | сам дописав обидва тести кроку 5 і порахував очікування   |
| **Пропи**       | масив у кожну клітинку       | рядок/`null`                | рядок/`null` і пояснення через `React.memo`               |
| **Git**         | один коміт з усім            | коміт по зеленому           | три коміти з назвами з плану, діф без сміття              |

</details>

## Питання після сесії

1. Чому `legalTargets === squareId` не працює, а `selectedSquare === squareId`
   працює?
2. Чому `Square` отримує `targetMark` (рядок), а не весь масив? Скільки
   клітинок перемалюється при перевиборі фігури в кожному з варіантів?
3. Чому `legalTargets = []` у параметрах `ChessBoardView` — погана ідея,
   хоча виглядає безпечно? (Згадай `[] === []` із сесії #5.)
4. Чому `getTargetMark` винесена в окремий файл, а не написана прямо в
   циклі? Що це дало для тестів?
5. Чому для `'capture'` достатньо «на клітинці є фігура» і не треба
   перевіряти колір?
