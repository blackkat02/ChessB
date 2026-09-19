# Годинники на глобальному відліку часу + повний запис партії

Дизайн-документ і покроковий план впровадження для двох пов'язаних задач:

1. **Годинники рахують час на основі `Date.now()` (глобальний відлік часу),
   а не на основі `setInterval`-тіків** — щоб не дрейфувати, не ламатись у
   фоновій вкладці й коректно відновлюватись після перезавантаження сторінки.
2. **Повний запис партії зберігає стан обох годинників на кожному
   напівході** — не лише сам хід (`from/to/piece/...`), а й скільки часу
   лишалось після нього.

Обидві задачі пов'язані технічно: коректний запис часу на кожен хід
неможливий, поки джерело істини для "скільки часу зараз лишилось" — це
локальний `setInterval` у React-компоненті, а не Redux.

## 1. Зв'язок з іншими документами

| Документ | Що звідти релевантне тут |
|---|---|
| `docs/move-notation.md`, розділ 5 | Модель елемента `history`. Свідомо **не** містить `timestamp` ("додавати означало б тримати дані, які ніхто не читає"). Ця причина знята — розділ 6 нижче додає поля, які дійсно використовуються. |
| `docs/move-notation.md`, розділ 9 | Дизайн `localStorage` (версія схеми, throttle). Актуальний, але **не враховує годинник на глобальному відліку** — розділ 6.4 тут його доповнює. |
| `docs/move-notation.md`, розділ 11 | Undo/перегляд історії, поле `fenAfter`. Той самий принцип ("знімок стану після ходу") застосовується тут до годинника — `clockAfter` поруч із `fenAfter`. |
| `docs/next-steps.md`, Крок 1 | localStorage зі схемою версій. **Цей документ замінює Крок 1** — реалізовувати `persistGame.js` варто одразу з урахуванням годинника, а не переробляти двічі. Розділ 8 тут дає оновлену послідовність кроків. |
| `docs/next-steps.md`, Крок 5/6 | PGN-експорт і undo. Обидва виграють від `clockAfter`/`moveTimeMs` (розділ 7), але їх реалізація лишається за межами цього документа — тут лише узгоджені назви полів, щоб не було розсинхрону. |

**Статус: реалізовано (усі 10 кроків розділу 8), плюс одна ревізія після
впровадження.** Перевірено на коді станом на 2026-09-19:
`turnStartedAt`/`selectClockRemaining` на місці, `updateTime` видалено,
`history` містить `timestamp`/`moveTimeMs`/`clockAfter`,
`persistGame.js`+`store.js` відновлюють партію без паузи. **Розділ 7.4**
документує ревізію, знайдену вже в роботі: централізований тік (7.1-7.3)
форсував перерендер усієї сторінки й проводив `Date.now()` через
`useSelector` — виправлено поверненням тіку в `Clock.jsx`, локально, на
тому самому якорі `Date.now()`/`turnStartedAt`. Повний тестовий набір —
184 тести, зелений. Розділ 11 нижче документує два
пункти, реалізовані **понад** початковий план цього документа.

## 2. Поточний стан коду (as-is) і чому це проблема

| Файл | Що робить зараз | Чому це проблема |
|---|---|---|
| `src/components/Clock/Clock.jsx:19-36` | Власний `useState(time)` + `setInterval(1000ms)`, що віднімає рівно 1000мс на тік | Браузери **тротлять `setInterval` у фонових вкладках** (аж до одного тіку на кілька секунд) — при поверненні у вкладку годинник відстає від реального часу на весь час перебування у фоні. Дрейф накопичується навіть без фону: `setInterval` не гарантує рівно 1000мс між тіками. |
| `src/redux/game/gameSlice.js:179-183` | `updateTime` reducer існує, приймає `{color, time}` | Ніде не диспатчиться — Redux (`state.game.whiteTime`/`blackTime`) **завжди дорівнює значенню на старті партії**, ніколи не оновлюється по ходу гри. Джерело істини для "поточний залишок часу" — лише локальний стан компонента `Clock`, який зникає при розмонтуванні/перезавантаженні. |
| `src/redux/store.js:18-26` | `store.subscribe` пише **весь** `state.game` в `localStorage` на кожен dispatch, нічого не читає при старті | Навіть якби читання було реалізоване (next-steps.md Крок 1), відновлений `whiteTime`/`blackTime` — це значення з початку партії (через попередній пункт), не поточний залишок. Реалізувати Крок 1 "в лоб" означало б зберігати **неправильний** час. |
| `src/redux/game/gameSlice.js:167-176` | `history.push({...action.payload, captured, castling, ...})` | Немає `timestamp` (коли зроблено хід) і немає стану годинників після ходу — партію не можна відтворити з коректним часом на кожному напівході (потрібно для PGN `%clk`, для undo/перегляду з відновленням часу, для аналізу "скільки часу витратив гравець на хід"). |
| `src/pages/HomePage/HomePage.jsx:39-41` | `isWhiteClockActive = isWhiteTurn && hasGameStarted`, `hasGameStarted = plyCount > 0` | **Існуюча, свідомо збережена поведінка**: перший хід білих — без годинника (жоден з двох годинників не активний, поки не зроблено жодного ходу). План нижче явно зберігає цю поведінку, а не "виправляє" її — це не баг, а наявний UX. |

## 3. Термінологія

- **Тік (heartbeat)** — періодичний виклик (кожні ~250мс) у React, який лише
  форсує перерендер, щоб годинник візуально "рухався". На відміну від
  поточного коду, тік **не є джерелом істини** для залишку часу — лише
  приводом його перерахувати.
- **Якір (`turnStartedAt`)** — `Date.now()` у момент, коли почала цокати
  поточна активна сторона. Разом зі збереженим `whiteTime`/`blackTime`
  (залишок **на момент початку** поточного ходу) дає змогу будь-якої миті
  порахувати точний поточний залишок: `remaining = storedTime - (Date.now() - turnStartedAt)`.
- **Глобальний відлік часу** — розрахунок через `Date.now()` замість
  накопичення `-1000мс` на кожен тік `setInterval`. Назва з формулювання
  задачі; технічно це "timestamp-anchored clock" на противагу
  "tick-accumulated clock".

## 4. Архітектурне рішення: якір + похідний селектор

**Прийнято:** зберігати в Redux лише `turnStartedAt` (якір) і "заморожені"
`whiteTime`/`blackTime` (залишок станом на початок поточного ходу активної
сторони). Поточний залишок — **завжди похідне значення**, порахований через
селектор, ніколи не зберігається в стані як "живе" число, що постійно
змінюється.

**Відхилено:** тримати "живий" залишок часу прямо в Redux і оновлювати його
на кожен тік (`dispatch(updateTime(...))` раз/сек, як натякає існуючий,
мертвий `updateTime`). Причини відхилення:

- Це і є поточна (позбавлена) модель `Clock.jsx`, тільки перенесена в
  Redux — сам факт зберігання "живого" числа не рятує від дрейфу, рятує лише
  **спосіб** його рахувати.
- Диспатч раз/сек на весь застосунок (навіть через middleware, не
  `store.subscribe` на все) — зайве навантаження на рендер порівняно з
  локальним переобчисленням у місці показу.
- Якірна модель **самокоригується**: якщо тік запізнився (фонова вкладка) —
  наступний виклик селектора все одно поверне правильне число, бо воно
  рахується від `Date.now()`, а не від попереднього "майже правильного".
  Модель "живого числа" успадковує дрейф, бо кожен тік будується на
  попередньому неточному значенні.

**Наслідок:** `updateTime` (gameSlice.js:179-183) видаляється — він не
вписується в нову модель і був мертвим кодом до цього моменту (розділ 8,
крок 1).

## 5. Модель даних

### 5.1. Redux: `state.game`

Нове поле:

```js
turnStartedAt: null, // Date.now() коли почала цокати активна сторона; null = годинники не йдуть
```

`null` означає "годинники зупинені" — три випадки: партія ще не почалась
(`plyCount === 0`, перший хід білих без годинника — розділ 2, останній
рядок таблиці), партія завершена (`isGameOver === true`), або (гіпотетично
в майбутньому) пауза. Умова "чи цокає годинник кольору X" лишається
похідною (як і зараз `selectIsClockActive`), просто додає перевірку на
`turnStartedAt !== null`.

`whiteTime`/`blackTime` лишаються в стані, але міняють семантику: це більше
не "поточний залишок" (яким вони фактично ніколи не були, розділ 2), а
**явно задокументований** "залишок часу станом на момент, коли активна
сторона отримала хід" — коректно замороженого значення для неактивної
сторони, і "початкового" для активної (з якого віднімається `Date.now() -
turnStartedAt`).

### 5.2. Похідний селектор — єдине джерело "скільки часу зараз"

```js
// src/redux/game/gameSelectors.js
export const selectClockRemaining = (state, color) => {
  const g = state.game;
  const stored = color === COLORS.WHITE ? g.whiteTime : g.blackTime;
  const isRunning =
    !g.isGameOver &&
    g.plyCount > 0 &&
    g.turnStartedAt !== null &&
    selectCurrentTurn(state) === color;

  if (!isRunning) return stored;
  return Math.max(0, stored - (Date.now() - g.turnStartedAt));
};
```

Це **єдине** місце в застосунку, що рахує "скільки часу лишилось зараз".
`Clock.jsx` (розділ 7.2), перевірка таймауту (розділ 7.3) і майбутній
`persistGame.js` (розділ 6.4) — усі йдуть через нього, а не рахують
самостійно.

### 5.3. Розширення елемента `history`

Три нових поля в об'єкті, який `moveExecuted` пушить у `history`
(`docs/move-notation.md`, розділ 5 — доповнення до вже реалізованої моделі):

```js
{
  // ...існуючі поля (from, to, piece, captured, castling, enPassant,
  // promotion, isCheck, isCheckmate, san) без змін...
  timestamp: 1758000000000,  // Date.now() у момент виконання ходу (абсолютний час)
  moveTimeMs: 4230,          // скільки мілісекунд думав гравець над ЦИМ ходом (Date.now() - turnStartedAt на момент ходу; 0 для першого ходу білих — розділ 2)
  clockAfter: { w: 176000, b: 180000 }, // залишок ОБОХ годинників одразу ПІСЛЯ цього ходу
}
```

`clockAfter` зберігає стан **обох** сторін (не лише того, хто щойно
ходив) — це прямий "знімок годинників на напівході", який просив дизайн:
дешево порахувати (обидва значення вже є в `state` на момент `push`), і
симетрично з `fenAfter` (`move-notation.md`, розділ 11) — той теж повний
знімок позиції, не diff.

**Чому саме ці три поля, а не один `clockAfter`:** `moveTimeMs` дублює
інформацію, яку технічно можна вирахувати з `timestamp` сусідніх елементів
`history`, але робити це на кожен рендер списку ходів (наприклад, майбутня
колонка "час на хід" у `MoveListView`) — зайва робота; зберегти один раз
при створенні ходу дешевше й надійніше (не залежить від сусідніх елементів
масиву).

## 6. Поведінка на межових випадках

| Ситуація | Що має відбутись | Як забезпечується |
|---|---|---|
| Вкладка згорнута 30с, потім повернулись | Годинник активної сторони показує коректний залишок мінус ці 30с, без стрибка чи "нуля з дрейфом" | `selectClockRemaining` рахує від `Date.now()` — тротлений `setInterval` не впливає на **результат**, лише на те, як часто він перераховується |
| Час вичерпався, поки вкладка була у фоні | Партія завершується таймаутом одразу, як тільки скрипт знову виконається (при поверненні у вкладку) | `visibilitychange` слухач (розділ 7.3) форсує негайну перевірку одразу при поверненні фокусу, не чекаючи наступного тіку |
| Перезавантаження сторінки (F5) або повне закриття вкладки посеред партії | Час, що минув, поки скрипт не виконувався, списується з активного гравця **так само**, як і час у згорнутій вкладці — без винятку. Якщо після відновлення виявляється, що ліміт уже вичерпано, партія одразу завершується таймаутом при першій же перевірці після монтування | **Нічого не робимо спеціально.** Відновлюємо `state.game`, включно з `turnStartedAt`, **без змін**. `selectClockRemaining` порахує `Date.now() - turnStartedAt` так само, якою була б ця різниця, якби вкладка просто простояла згорнутою весь цей час — немає окремого коду для "паузи" (розділ 6.1, розділ 8, крок 8) |
| Перший хід партії (білі) | Без годинника, як і зараз (розділ 2) | `turnStartedAt === null` до першого ходу → `moveExecuted` нічого не списує (розділ 8, крок 1) |
| Таймаут "прийшов" двічі (гонка: heartbeat і, наприклад, майбутній ручний тригер) | Другий виклик — no-op, не перезаписує вже завершену партію | `timeExpired` thunk перевіряє `isGameOver` (вже є) і додатково `selectClockRemaining(state, color) > 0` перед дисптачем `endGame` (розділ 8, крок 5) — захист від застарілого замикання в `setTimeout`/`setInterval` |
| Гра завершується матом/патом/здачею (не таймаутом) | `turnStartedAt` обнуляється, годинники "заморожуються" на своєму останньому значенні | `endGame` reducer завжди виставляє `turnStartedAt: null` (розділ 8, крок 1) |

### 6.1. Свідоме рішення: без компенсації за офлайн-час (як на Lichess/Chess.com)

**Попередня версія цього документа пропонувала "прощати" час, що минув,
поки сторінка була закрита** (скидати `turnStartedAt` при відновленні,
розділ 8, крок 8 у першій версії). Це рішення **відхилено** — на користь
uniform-моделі з таблиці вище, з двох причин:

1. **Так не роблять популярні платформи.** І Lichess, і Chess.com рахують
   час на сервері й **не ставлять годинник на паузу**, поки клієнт
   відключений, згорнутий чи закритий — годинник активної сторони йде
   далі, і якщо ліміт вичерпується, гравець програє по часу, навіть не
   бачачи цього в реальному часі ("flag on reconnect": відкривши партію
   заново, він одразу бачить поразку). Компенсація, яку ці платформи
   дійсно роблять, — **інша**: невелика й обмежена компенсація мережевої
   затримки конкретно на **передачу ходу** (нижче), не на весь час
   відключення.
   - **Lichess:** сервер — джерело істини для годинника; клієнт лише
     показує локальну проекцію. Сервер оцінює затримку з'єднання гравця
     (через ping/pong вебсокета) і видає невеликий, **обмежений пул**
     компенсації (порядку секунд, що повільно накопичується й
     витрачається за потреби) — щоб нормальний мережевий джиттер не
     "з'їдав" час гравця на кожен хід. Це захист від **шуму мережі на
     одному ході**, не прощення тривалого простою/відключення.
   - **Chess.com:** аналогічно server-authoritative з невеликим запасом на
     затримку окремого запиту; тривале відключення так само призводить до
     програшу по часу при поверненні, а не до паузи годинника.
2. **У цьому застосунку немає мережі, тож немає що компенсувати.** Хід
   обробляється синхронно в тому ж процесі (Redux `dispatch`) — затримка
   між "гравець клікнув" і "хід застосувався" вимірюється частками
   мілісекунди, це не порівнянна за природою величина з мережевим
   round-trip'ом, і окремо компенсувати її немає сенсу (вона й так вже
   включена в `moveTimeMs`, розділ 5.3, так само, як фізичний годинник
   рахує час, витрачений на натискання кнопки).

**Наслідок:** розділ 8, крок 8 (нижче) **не** скидає й не перераховує
`turnStartedAt` при відновленні зі сховища — просто відновлює `state.game`
як є. Якщо гравець повернувся, а час уже вичерпано, партія завершується
таймаутом одразу після монтування (той самий механізм, що й для згорнутої
вкладки, розділ 7.1-7.2 — жодного спеціального випадку).

## 7. Зміни в компонентах

> **Розділи 7.1-7.3 нижче — історичні, замінені.** Централізований
> `useClockTicker`, підключений у `useGameState.js`, дійшов до продакшену
> (Кроки 3-4 розділу 8) і навіть пройшов ручну й автоматизовану перевірку —
> але виявив реальну проблему вже після впровадження: **розділ 7.4**
> нижче пояснює, що саме пішло не так, і яка архітектура замінила цю.
> Код-приклади тут лишені як є (не переписані заднім числом) — саме через
> порівняння "було / стало" видно, чому заміна була потрібна.

### 7.1. `useClockTicker` — новий хук, єдиний "пульс" застосунку

Один інтервал на весь застосунок (не по одному на кожен `Clock`, як зараз
неявно вийшло б, якби просто скопіювати підхід) — і форсує перерендер, і
перевіряє таймаут.

```js
// src/hooks/useClockTicker.js
import { useEffect, useState } from 'react';

const TICK_MS = 250; // достатньо часто для плавного відображення секунд, не навантажує рендер

export const useClockTicker = (isRunning) => {
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!isRunning) return undefined;

    const tick = () => forceRerender((n) => n + 1);
    const interval = setInterval(tick, TICK_MS);
    // Фонова вкладка тротлить `setInterval` — при поверненні фокусу форсуємо
    // негайний перерахунок замість очікування наступного тіку (розділ 6).
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [isRunning]);
};
```

### 7.2. `useGameState.js` — під'єднати тікер і похідні залишки часу

```js
// доповнення до src/hooks/useGameState.js
import { useClockTicker } from './useClockTicker';

// ...усередині useGameState():
const isGameOver = useSelector(selectors.selectIsGameOver);
const hasGameStarted = useSelector(selectors.selectHasGameStarted);
const turnStartedAt = useSelector((state) => state.game.turnStartedAt); // лише для isRunning нижче

const isClockRunning = hasGameStarted && !isGameOver && turnStartedAt !== null;
useClockTicker(isClockRunning);

const whiteTimeRemaining = useSelector((state) => selectors.selectClockRemaining(state, COLORS.WHITE));
const blackTimeRemaining = useSelector((state) => selectors.selectClockRemaining(state, COLORS.BLACK));

// Перевірка таймауту — той самий "пульс", що форсує перерендер (7.1),
// природно викликає й цю перевірку на кожному рендері активного годинника.
useEffect(() => {
  if (!isClockRunning) return;
  const turn = /* selectCurrentTurn */;
  const remaining = turn === COLORS.WHITE ? whiteTimeRemaining : blackTimeRemaining;
  if (remaining <= 0) dispatch(timeExpired(turn));
});
```

`whiteTime`/`blackTime` (сирі, "заморожені" значення з розділу 5.1)
**більше не йдуть напряму в `gameState`, що повертає хук** — замість них
`whiteTimeRemaining`/`blackTimeRemaining` (розділ 8, крок 3 — деталі, куди
саме це підключити, щоб не зламати `GameInfoPanel`/`Clock` одним комітом).

### 7.3. `Clock.jsx` — стає суто презентаційним

Прибирається: `useState(time)`, `useEffect` зі `setInterval`, логіка
`onTimeUp` (переїхала в `useGameState`, розділ 7.2). Лишається: форматування
й візуальний стан (`isLowTime` тощо) на основі значення, яке приходить
ззовні.

```js
// src/components/Clock/Clock.jsx — після зміни
const Clock = ({ remainingMs, color, isActive, isGameOver }) => {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const isLowTime = totalSeconds > 0 && totalSeconds < 30;
  const isWhite = color === COLORS.WHITE;

  return (
    // ...той самий JSX, {formatTime(time)} → {formatTime(remainingMs)}...
  );
};
```

Пропси `initialTime`/`onTimeUp` зникають; `GameInfoPanel.jsx` передає
`remainingMs={whiteTimeRemaining}`/`remainingMs={blackTimeRemaining}` замість
`initialTime={gameState.whiteTime}`.

### 7.4. Ревізія: тік і виявлення таймауту повернулись у `Clock.jsx`

**Що знайшлось після впровадження Кроків 3-4** (в реальному використанні,
не в тестах): два пов'язаних дефекти в централізованій моделі 7.1-7.3.

1. **"Повний рендер сторінки" на кожен тік.** `useClockTicker` викликався
   всередині `useGameState()`, а цей хук — усередині `HomePage`. Форсований
   перерендер (`forceRerender` у 7.1) — це `useState` в `HomePage`, тож
   форсувався перерендер **усього** дерева під нею: дошка, список ходів,
   кнопки — усе перемальовувалось 4 рази на секунду (10 разів — нижче
   `LOW_TIME_THRESHOLD_MS`), хоча змінювались лише дві цифри на годинниках.
2. **`Date.now()` усередині `useSelector` — порушення контракту
   `useSyncExternalStore`.** `whiteTimeRemaining`/`blackTimeRemaining`
   читались через `useSelector(state => selectClockRemaining(state, color))`
   (7.2). Але `selectClockRemaining` (розділ 5.2) не є чистою функцією
   лише від Redux-стану — вона читає `Date.now()`. `useSelector` у
   react-redux побудований на `useSyncExternalStore`, чий контракт вимагає,
   щоб повторний виклик селектора з ТИМ САМИМ станом повертав ТЕ САМЕ
   значення, поки стор дійсно не змінився (React звіряє "знімок" одразу
   після рендеру, щоб виявити "розрив" зовнішнього джерела під час
   рендеру). Селектор, що завжди повертає нове число, порушує цю умову —
   і хоч у jsdom (тестове середовище) це не відтворилось як буквальний
   нескінченний цикл (fake-таймери "заморожують" `Date.now()` між
   викликами, на відміну від реального браузера), сам патерн — відомий і
   задокументований React-антипатерн, вартий виправлення незалежно від
   того, наскільки драматично він проявляється в конкретному середовищі.

**Рішення: `Clock.jsx` знову рахує сам, локально** — та сама ідея, що була
до Кроку 3 (`Clock` володіє власним тіком), але тепер на якорі
`Date.now()`/`turnStartedAt` замість декременту, тож дрейф (розділ 2,
причина, з якої все це починалось) не повертається.

```js
// src/components/Clock/Clock.jsx (фінальна версія)
const Clock = ({ storedMs, turnStartedAt, color, isActive, isGameOver, onTimeUp }) => {
  const [, forceRerender] = useState(0);
  const isRunning = isActive && !isGameOver && turnStartedAt !== null;

  // Date.now() ТУТ — звичайний, непов'язаний з Redux локальний рендер,
  // не useSelector/useSyncExternalStore — контракту нема що порушувати.
  const remainingMs = isRunning
    ? Math.max(0, storedMs - (Date.now() - turnStartedAt))
    : storedMs;

  useEffect(() => {
    if (!isRunning) return undefined;
    let timeoutId;
    let firedTimeUp = false;

    const tick = () => {
      const remaining = Math.max(0, storedMs - (Date.now() - turnStartedAt));
      forceRerender((n) => n + 1);
      if (remaining <= 0) {
        if (!firedTimeUp) { firedTimeUp = true; onTimeUp?.(color); }
        return; // не плануємо наступний тік
      }
      const delay = remaining < LOW_TIME_THRESHOLD_MS ? FAST_TICK_MS : NORMAL_TICK_MS;
      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, 0); // перший тік негайно — "flag on reconnect" без затримки
    const onVisibility = () => forceRerender((n) => n + 1);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isRunning, storedMs, turnStartedAt, color, onTimeUp]);

  // ...formatTime(remainingMs) у JSX, як і раніше...
};
```

Наслідки для решти застосунку:

- **`useGameState.js` знову тонкий.** Повертає сирі `whiteTime`/
  `blackTime`/`turnStartedAt` (пряме читання Redux, без обчислень) і
  `handleTimeUp` — тонку обгортку `(color) => dispatch(timeExpired(color))`.
  Ніякого центрального тікера, ніякого `useEffect` без масиву залежностей.
- **`GameInfoPanel.jsx` передає `storedMs`/`turnStartedAt`/`onTimeUp`**
  замість `remainingMs` — `Clock` сам вирішує, що з ними робити.
- **`useClockTicker.js` видалений цілком** — нічого більше його не
  використовує; `NORMAL_TICK_MS`/`FAST_TICK_MS` тепер локальні константи
  в `Clock.jsx`.
- **Перерендер на тік лишається в межах одного `Clock`.** Два екземпляри
  (білий/чорний) — два незалежних локальних тікери; `HomePage`/дошка/
  список ходів більше не перемальовуються 4-10 разів на секунду заради
  цифр на годиннику.
- **Захист від гонки в `gameOperations.timeExpired` (Крок 5) лишається
  без змін** — `Clock` викликає `onTimeUp` на основі власного, локального
  розрахунку; `timeExpired` все одно перевіряє `selectClockRemaining`
  живим Redux-станом перед тим, як реально завершити партію. Два незалежні
  джерела "коли час вичерпався" (локальне в `Clock`, і остаточне в Redux)
  — це не дублювання про всяк випадок, а саме та відмальовка "запропонував
  — Redux вирішив", яка вже була в дизайні з самого початку.

**Урок, вартий запам'ятати:** значення, що залежить від `Date.now()` (чи
будь-якого іншого джерела, що змінюється незалежно від Redux-стану), не
повинно проходити через `useSelector` — воно за означенням не вписується
в контракт "зовнішнього стора". Або рахувати його локально в компоненті
(як тут), або явно поза `useSelector` (наприклад, через `useStore().getState()`
у момент, коли компонент і так перерендерюється з іншої причини).

## 8. Детальний покроковий план впровадження

Кожен крок — окремий коміт, з описаним нижче критерієм "готово". Порядок
важливий: пізніші кроки спираються на типи/поля з попередніх. Кроки 1-5 —
сам механізм годинника; кроки 6-9 — збереження повної партії (замінює
`next-steps.md`, Крок 1); крок 10 — прибирання й звірка з рештою плану.

### Крок 1 — `turnStartedAt` у слайсі, списання часу в `moveExecuted`, прибрати `updateTime`

Файл: `src/redux/game/gameSlice.js`.

1. `initialState`: додати `turnStartedAt: null`.
2. У `moveExecuted`, **перед** `state.selectedSquare = null` (щоб мати доступ
   до старого `state.turnStartedAt` до будь-яких змін):
   ```js
   let moveTimeMs = 0;
   if (typeof state.turnStartedAt === 'number') {
     moveTimeMs = Date.now() - state.turnStartedAt;
     const moverColor = getPieceColor(piece);
     if (moverColor === COLORS.WHITE) {
       state.whiteTime = Math.max(0, state.whiteTime - moveTimeMs);
     } else {
       state.blackTime = Math.max(0, state.blackTime - moveTimeMs);
     }
   }
   state.turnStartedAt = Date.now();
   ```
   (перший хід білих: `turnStartedAt === null` → `moveTimeMs` лишається `0`,
   нічого не списується — зберігає поведінку з розділу 2/6.
   **`typeof ... === 'number'`, а не `!== null`:** знадобилось під час
   реалізації — старі знімки стану в тестах (`gameSlice.test.js`) не мають
   поля `turnStartedAt` узагалі, воно `undefined`, а `undefined !== null` —
   `true`, тож наївна перевірка спробувала б рахувати `Date.now() -
   undefined` і записала б `NaN` у `whiteTime`/`blackTime`).
3. У `endGame`:
   ```js
   endGame: (state, action) => {
     const { winner, reason, timedOutColor } = action.payload;
     if (reason === 'timeout' && timedOutColor && typeof state.turnStartedAt === 'number') {
       const elapsed = Date.now() - state.turnStartedAt;
       if (timedOutColor === COLORS.WHITE) state.whiteTime = Math.max(0, state.whiteTime - elapsed);
       else state.blackTime = Math.max(0, state.blackTime - elapsed);
     }
     state.winner = winner;
     state.reason = reason;
     state.isGameOver = true;
     state.turnStartedAt = null;
   },
   ```
4. Видалити `updateTime` (reducer + експорт) — мертвий код (розділ 4).

Тести: `gameSlice.test.js` — новий кейс "moveExecuted списує час активної
сторони з urahuvannям `turnStartedAt`" (з `vi.setSystemTime`), кейс "перший
хід партії нічого не списує", кейс "endGame з `reason: 'timeout'` фіксує
залишок у 0 для сторони, що прострочила час".

**Готово, коли:** `npm run test -- gameSlice` зелений; `grep -n updateTime
src -r` не знаходить нічого поза тестами, які теж треба прибрати/оновити.

### Крок 2 — `selectClockRemaining`

Файл: `src/redux/game/gameSelectors.js` — додати функцію з розділу 5.2.

Тести (новий блок у `gameSelectors.test.js`, з `vi.useFakeTimers()` +
`vi.setSystemTime()`):

- годинник неактивної сторони повертає сире `whiteTime`/`blackTime` без змін;
- годинник активної сторони зменшується рівно на змодельований `advance`
  (`vi.advanceTimersByTime`/`vi.setSystemTime` на N мс уперед);
- не йде нижче нуля, навіть якщо змодельований час перевищує залишок;
- `plyCount === 0` (гра не почалась) → жоден колір не "running", навіть якщо
  `turnStartedAt` чомусь не `null` (захист від неконсистентного стану).

**Готово, коли:** тести вище зелені; функція ніде ще не використовується
(підключення — кроки 3-4), тому решта застосунку не змінюється в цьому
коміті.

### Крок 3 — підключити `selectClockRemaining` у `useGameState`/UI

Файли: новий `src/hooks/useClockTicker.js` (код розділу 7.1),
`src/hooks/useGameState.js` (розділ 7.2), `src/components/Clock/Clock.jsx`
(розділ 7.3), `src/components/GameInfoPanel/GameInfoPanel.jsx` (пропси
`remainingMs` замість `initialTime`, прибрати `onTimeUp` з `Clock`, лишити
`onTimeUp`/`handleTimeUp` тільки на рівні `useGameState`).

Робити саме в такому порядку всередині коміту (кожен під-крок можна
перевірити в браузері окремо, `npm run dev`):

1. Додати `useClockTicker.js`, поки нікуди не підключений — не впливає на
   застосунок.
2. Підключити тікер + `selectClockRemaining` у `useGameState.js`, повертати
   `whiteTimeRemaining`/`blackTimeRemaining` **на додачу** до старих
   `whiteTime`/`blackTime` (тимчасово обидва) — застосунок далі working,
   нічого візуально не зміниться, поки `Clock.jsx` не переключений.
3. Переключити `Clock.jsx` на `remainingMs`/прибрати внутрішній
   `setInterval` (розділ 7.3) і `GameInfoPanel.jsx` на нові пропси.
4. Прибрати з `useGameState.js` тепер уже нікому не потрібні
   `whiteTime`/`blackTime` зі старого `gameState` (лишити лише
   `whiteTimeRemaining`/`blackTimeRemaining`), перевірити, хто ще їх читав
   (`grep -rn "gameState.whiteTime\|gameState.blackTime" src`).

Ручна перевірка в браузері (`npm run dev`) **перед комітом**: нова партія
→ годинник активної сторони видимо цокає раз/секунду; неактивної — стоїть;
переключення ходу передає цокання іншій стороні; час вичерпується →
`GameOverModal` з `reason: 'timeout'` показується коректній стороні.

**Готово, коли:** `Clock.jsx` не містить `useState`/`setInterval` (лише
форматування); ручна перевірка вище пройдена; існуючі
`gameOperations.test.js` (`timeExpired`) далі зелені без змін логіки самого
thunk'а (розділ 8, крок 5 — де саме thunk міняється).

> **Ревізія (розділ 7.4):** цей критерій "готово" описує стан ПІСЛЯ Кроку
> 3, до знахідки "повний рендер сторінки". Після ревізії `Clock.jsx` знову
> містить `useState`/локальний таймер (`setTimeout`, не `setInterval`) —
> свідомо, з інших причин, ніж у розділі 2 (там — дрейф; тут — ізоляція
> перерендеру в межах компонента). Актуальний критерій "готово" для
> фінальної архітектури — розділ 7.4.

### Крок 4 — ручна перевірка фонової вкладки (не код, чекліст перед наступним кроком)

Без змін коду — перевірка, що крок 3 дійсно вирішує проблему з розділу 2:

1. Почати партію, зробити хід (годинник чорних пішов).
2. Згорнути вкладку (або перемкнутись на іншу) на ~20 секунд реального часу.
3. Повернутись — годинник має одразу показати коректний залишок (мінус ці
   20с), без "стрибка" чи застряглого старого значення.
4. Повторити, але дочекатись у фоні повного вичерпання часу (для короткого
   контролю, наприклад 1 хв) — при поверненні партія вже має бути завершена
   таймаутом (`visibilitychange` тригернув перевірку).

**Готово, коли:** обидва сценарії пройдені візуально; якщо ні — це сигнал
повернутись до кроку 3 (найімовірніша причина: `visibilitychange`-слухач не
підключений або `forceRerender` не тригерить `useEffect` перевірки
таймауту в `useGameState`).

### Крок 5 — захист від гонки в `timeExpired`

Файл: `src/redux/game/gameOperations.js`.

```js
export const timeExpired = (color) => (dispatch, getState) => {
  const state = getState();
  if (state.game.isGameOver) return;
  if (selectors.selectClockRemaining(state, color) > 0) return; // розділ 6, рядок "таймаут прийшов двічі"
  dispatch(endGame({ winner: getOpponentColor(color), reason: 'timeout', timedOutColor: color }));
};
```

Тест: `gameOperations.test.js` — виклик `timeExpired` для кольору, чий
`selectClockRemaining` ще > 0 (змодельовано через `vi.setSystemTime` з
недостатнім зсувом), не завершує партію.

**Готово, коли:** новий тест зелений; існуючі тести `timeExpired` (справжній
таймаут) далі зелені.

### Крок 6 — `history`: `timestamp`, `moveTimeMs`, `clockAfter`

Файл: `src/redux/game/gameSlice.js`, `push` у `moveExecuted` (розділ 5.3).
`moveTimeMs` тут — те саме значення, пораховане в кроці 1 (не рахувати
двічі, підняти у змінну на рівні функції).

```js
state.history.push({
  ...action.payload,
  captured, castling, enPassant, promotion: promotionPiece,
  isCheck: givesCheck, isCheckmate: givesCheckmate, san,
  timestamp: now, // той самий Date.now(), що й новий turnStartedAt (крок 1) — одна мить, не два окремих виміри
  moveTimeMs,
  clockAfter: { w: state.whiteTime, b: state.blackTime },
});
```

**Уточнення проти кроку 1 вище:** `Date.now()` варто викликати рівно один
раз на весь редюсер (`const now = Date.now()` на початку блоку годинника,
крок 1) і використати цю саму змінну і для нового `turnStartedAt`, і для
`timestamp` тут — вони описують ту саму подію, тож мають бути буквально
однаковим числом, а не двома близькими, але різними вимірами.

**Увага (як і `move-notation.md`, Крок 6, п.1 next-steps.md):** це зміна
форми `history` — **окремий коміт**, одразу прогнати `npm run test` повністю.
Тести, що звіряють точну форму елемента `history` (`toEqual`), доведеться
оновити на `expect.objectContaining({...})` або додати очікувані нові поля
явно — якщо тест довелось міняти інакше (не просто додати поле), це сигнал,
що зачепилась поведінка, а не тільки форма.

**Готово, коли:** повний `npm run test` зелений; ручна перевірка — зробити
кілька ходів, у Redux DevTools подивитись `state.game.history` — кожен
елемент має `timestamp`/`moveTimeMs`/`clockAfter` з правдоподібними
значеннями (перший хід: `moveTimeMs: 0`).

### Крок 7 — `persistGame.js`: збереження живого залишку часу

Файли: новий `src/redux/persistGame.js` (окремо від `store.js`, щоб
тестувати без Redux — та сама структура, що й `next-steps.md`, Крок 1,
п.1, доповнена годинником).

```js
export const STORAGE_KEY = 'chessb:v1:game';
export const SCHEMA_VERSION = 2; // 2, не 1 — payload тепер містить clockAfter/timestamp в history (крок 6)

export function savePersistedGame(gameState) {
  try {
    const payload = { version: SCHEMA_VERSION, savedAt: Date.now(), state: gameState };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Не вдалося зберегти стан:', err);
  }
}

export function loadPersistedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const payload = JSON.parse(raw);
    if (payload.version !== SCHEMA_VERSION) return undefined;
    return payload.state;
  } catch {
    return undefined;
  }
}
```

**На відміну від першої версії цього документа:** `gameState`, що
передається в `savePersistedGame`, — це **сирий** `state.game` без жодних
перетворень (включно з `turnStartedAt` як є). Розрахунок "живого" залишку
тут навмисно **не** робиться (розділ 6.1) — `whiteTime`/`blackTime` і так
коректно відображають "заморожене на момент останнього ходу" значення
(розділ 5.1), а `turnStartedAt` при відновленні лишається тим самим
якорем, тож час, що минув із моменту збереження до відновлення, порахується
природно, без спеціального коду (розділ 8, крок 8).

Тести: `src/redux/persistGame.test.js` — збереження/читання round-trip,
неправильна версія схеми → `undefined`, пошкоджений JSON → `undefined`,
`localStorage.setItem` кидає виняток (квота/приватний режим) → не кидає
назовні.

**Готово, коли:** тести вище зелені (без підключення до `store.js` — це
крок 8).

### Крок 8 — підключення: middleware замість `store.subscribe` на все, відновлення при старті

Файли: `src/redux/store.js` (переписати), `src/main.jsx` або
`HomePage.jsx` (де зручніше прочитати збережений стан один раз при старті).

1. `store.js`: прибрати наявний `store.subscribe(...)` (розділ 2, рядок
   `store.js`). Замість нього — middleware, що реагує вибірково (не на
   кожен action, розділ 2 — стара проблема "пише на кожен тік годинника";
   годинник сам по собі більше не дисптачить жодного action, розділ 7.1, тож
   троттлити тут уже нема що троттлити):
   ```js
   const PERSIST_ON = new Set(['game/moveExecuted', 'game/endGame', 'game/newGameStarted']);

   const persistenceMiddleware = (store) => (next) => (action) => {
     const result = next(action);
     if (PERSIST_ON.has(action.type)) {
       savePersistedGame(store.getState().game); // сирий стан, без перетворень (розділ 6.1)
     }
     return result;
   };
   ```
   (`newGameStarted` — у списку, інакше перезавантаження після "Нова гра",
   але до першого ходу, підхопить **попередню** партію зі старого запису).
2. Старт застосунку — прочитати збережений стан і, якщо є, підставити як
   `preloadedState` **без жодних змін полів**:
   ```js
   const persisted = loadPersistedGame();
   const preloadedState = persisted ? { game: persisted } : undefined;

   export const store = configureStore({
     reducer: { game: gameReducer },
     preloadedState,
     middleware: (getDefaultMiddleware) =>
       getDefaultMiddleware({ serializableCheck: false }).concat(persistenceMiddleware),
   });
   ```
   `turnStartedAt` переноситься як є (розділ 6.1) — якщо партія була
   в процесі й час активного гравця вже вичерпався, поки застосунок був
   закритий, `selectClockRemaining` поверне `0` одразу на першому рендері,
   і той самий `useEffect` у `useGameState` (розділ 7.2), що ловить таймаут
   у фоновій вкладці, зловить і цей випадок — без окремого коду.

**Готово, коли:** перезавантаження сторінки посеред партії відновлює дошку
й історію (з `timestamp`/`clockAfter`); перевірка секундоміром — зробити
хід, зачекати рівно 10с, перезавантажити — годинник одразу показує
`попередній залишок - ~10с` (не "попередній залишок", як було б при паузі);
якщо перед перезавантаженням лишалось менше часу, ніж пройшло до
відновлення сторінки, партія одразу (на першому тіку) завершується
таймаутом; зміна `SCHEMA_VERSION` симулює несумісність схеми й не ламає
застосунок.

### Крок 9 — тести підключення (`store.js`)

Файл: `src/redux/store.test.jsx` (не `.js` — сценарій "таймаут одразу після
монтування" рендерить `<Provider store={store}>` через
`@testing-library/react`, тож файлу потрібна JSX-трансформація, яку Vite за
замовчуванням застосовує лише до `.jsx`).

- Створення store без збереженого стану → дефолтний `initialState`.
- Збережений стан із `plyCount > 0`, `isGameOver: false`, `turnStartedAt: T`
  → `preloadedState.game.turnStartedAt` дорівнює **тому самому** `T`
  (не скинутий, розділ 6.1) — свідомо протилежний тест до того, що був у
  першій версії цього документа.
- Той самий кейс, але `vi.setSystemTime` виставлено на момент, коли
  `Date.now() - T` вже перевищує збережений залишок часу активної сторони
  → після монтування (перший тік `useGameState`, розділ 7.2) партія
  завершується `endGame({reason: 'timeout'})` — "flag on reconnect", як в
  розділі 6.1.
- Збережений стан з `isGameOver: true` → `turnStartedAt: null` лишається
  `null` (уже так у збереженому стані завдяки `endGame`, розділ 8, крок 1 —
  тут лише перевірка, що відновлення нічого не "оживляє").
- `dispatch(moveExecuted(...))` викликає запис у `localStorage`
  (мокнути `savePersistedGame` або перевірити сам `localStorage.getItem`
  після dispatch); `dispatch(setSelection(...))` — **не** викликає.

**Готово, коли:** тести вище зелені; `npm run test` (весь набір) зелений.

### Крок 10 — прибирання, звірка з `next-steps.md`

1. `grep -rn "console\." src --include=*.jsx --include=*.js` (без
   `.test.js`) — переконатись, що нові файли (`useClockTicker.js`,
   `persistGame.js`, `store.js`) не додали новий debug-вивід понад той, що
   вже описаний у `next-steps.md`, Крок 2 (окрема, вже спланована задача —
   не змішувати в цьому коміті).
2. Оновити `docs/next-steps.md`:
   - Крок 1 (`localStorage`) позначити як виконаний **через цей документ**,
     з посиланням сюди, а не переписувати нею ж чернетку коду в
     `move-notation.md`, розділ 9 (той код застарів — не враховував
     годинник, розділ 2 тут).
   - У Кроці 6 (Undo), п.1 — де згадується "старі записи в `localStorage` не
     матимуть `fenAfter`" — додати ту саму примітку про `clockAfter`/
     `timestamp`/`moveTimeMs` (вони вже є, `fenAfter` — ще ні; підняти
     `SCHEMA_VERSION` на 3 тоді, не на 2, бо 2 вже зайнята цим документом).
   - У Кроці 5 (PGN) додати рядок: `%clk`-анотації в PGN-тілі можна брати з
     `clockAfter` без додаткової роботи (не обов'язково робити зараз, лише
     зафіксувати, що дані для цього вже будуть).

**Готово, коли:** `next-steps.md` не суперечить фактичному стану коду
(та сама вимога, що вже стоїть на початку `next-steps.md` — "Статус"
рядок нагорі документа).

## 9. Тестування — загальна стратегія

Усі нові тести, що залежать від часу, використовують `vi.useFakeTimers()` +
`vi.setSystemTime(ts)` (не `vi.advanceTimersByTime` там, де достатньо
переставити системний час одним стрибком — простіше й читабельніше для
"якірної" моделі, де важливий лише `Date.now()` у двох точках, не сама
послідовність тіків). Приклад форми тесту:

```js
import { vi } from 'vitest';

it('списує час активної сторони на moveExecuted', () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  let state = reducer(initialStateWithTurnStartedAt(1_000_000), moveExecuted({ from: 'e2', to: 'e4', piece: 'P' }));
  // ще той самий момент часу — 0 списано, ОК (перший хід)

  vi.setSystemTime(1_004_230); // +4.23с
  state = reducer(state, moveExecuted({ from: 'e7', to: 'e5', piece: 'p' }));
  expect(state.blackTime).toBe(DEFAULT_TIME - 4230);

  vi.useRealTimers();
});
```

## 10. Що навмисно поза цим планом

- **Компенсація часу за офлайн-простій (пауза при закритій/фоновій
  вкладці)** — розглядалась і **свідомо відхилена** (розділ 6.1): популярні
  платформи (Lichess, Chess.com) не ставлять годинник активного гравця на
  паузу через відключення/закриття клієнта, лише компенсують дрібну
  мережеву затримку окремого ходу через обмежений пул — а в цьому застосунку
  мережі взагалі нема, тож компенсувати нічого. Якщо це рішення захочеться
  переглянути пізніше — почати варто саме з розділу 6.1, не з коду.
- **Інкремент (Fischer/Bronstein)** — `gameConstants.js` наразі не має
  жодної концепції інкременту (розділ `TIME_CONTROLS` — лише фіксований
  час). Якірна модель годинника з цього документа сумісна з інкрементом
  (додати `+ increment` при списанні в `moveExecuted`, крок 1), але сам
  інкремент — окрема продуктова фіча, не частина цього плану.
- **Синхронізація часу між пристроями (мультиплеєр)** — `Date.now()`
  локальний до пристрою; мультиплеєр вимагав би довіри до одного пристрою
  (сервера) як джерела `turnStartedAt`, що поза межами поточної
  однопристроєвої гри (`next-steps.md`, розділ 6, той самий висновок про
  мультиплеєр).
- **Пауза партії за запитом гравця** — `turnStartedAt: null` як стан
  технічно вже підтримує паузу (розділ 5.1), але UI для неї (кнопка
  "Пауза") не проєктується тут — нема запиту на цю фічу.

## 11. Що реалізовано понад початковий план цього документа

Два пункти з'явились органічно під час впровадження (не були заплановані
жодною попередньою версією цього документа) — фіксую тут заднім числом,
щоб документ не мовчав про реальний код.

**Десяті долі секунди й динамічна частота тіку.** З'явилось під час Кроку
3, спершу через (тепер видалений) `useClockTicker`; після ревізії
(розділ 7.4) `NORMAL_TICK_MS`/`FAST_TICK_MS` — локальні константи в
`Clock.jsx`, і саме він вирішує, з якою швидкістю тікати, на основі
власного щойно порахованого `remaining`. Нижче `LOW_TIME_THRESHOLD_MS`
(`gameConstants.js`, 10000мс — той самий поріг, що на Lichess/Chess.com)
`Clock.jsx` показує десяті долі секунди ("9.7") замість "00:09". Мотивація
й деталі порогу — коментарі в `gameConstants.js` і `Clock.jsx`, не в цьому
документі (він писався до цього рішення).

**Мемоізація `selectMovePairs`.** Побічний ефект частого перерендеру:
поки годинник рахувався централізовано (розділи 7.1-7.3, до ревізії 7.4),
форсований перерендер усього дерева під `HomePage` кілька разів на секунду
означав, що немемоізований `selectMovePairs` (`gameSelectors.js`,
`docs/move-notation.md` розділ 7) — що повертав НОВИЙ масив на кожен
виклик через `.reduce(..., [])` — почав викликати попередження
react-redux "Selector ... returned a different result when called with
the same parameters". Виправлено через `createSelector` (реекспорт
`reselect` з `@reduxjs/toolkit`). Не пов'язано з годинником по суті (і
лишається доречним фіксом навіть після ревізії 7.4, яка прибрала
першопричину частих рендерів) — виявлено й виправлено як наслідок цієї
роботи, не задум.
