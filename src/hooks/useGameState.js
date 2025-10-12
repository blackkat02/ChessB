import { useState, useCallback, useEffect } from 'react';
import { initialBoardPiecesObject } from '../data/positions';
import { loadGameState, saveGameState, clearGameState } from '../storage/localStorageService';

// Єдине Джерело Істини: Використовуємо ЦЕ скрізь
const INITIAL_GAME_BASE_STATE = {
  boardPiecesObject: initialBoardPiecesObject,
  selectedSquare: null,
  whiteTime: 180000,
  blackTime: 180000,
  currentTurn: 'w',
  moveHistory: [],
};

// Функція для визначення кольору фігури
/**
 * Визначає колір фігури на основі її FEN-символу.
 * 'P', 'R', 'K' -> 'w' (White)
 * 'p', 'r', 'k' -> 'b' (Black)
 */
export const getPieceColor = (fenSymbol) => {
    if (!fenSymbol) {
        return null; // Порожня клітинка
    }

    // ✅ Якщо символ дорівнює своїй версії у верхньому регістрі (наприклад, 'P' === 'P'), це біла фігура.
    if (fenSymbol === fenSymbol.toUpperCase()) {
        return 'w';
    } 
    // Інакше, це чорна фігура (наприклад, 'p' !== 'P').
    return 'b';
};

// ВІДНОВЛЕННЯ СТАНУ З LOCAL STORAGE (або використання початкового)
const getInitialState = () => { // Більше не приймає initialBoardPiecesObject, бо воно в константі
  const savedState = loadGameState();

  if (savedState && savedState.gameId) {
    console.log("💾 Завантажено збережений локальний стан.");
    return savedState;
  }

  console.log("🆕 Початковий стан гри ініціалізовано.");

  return {
    ...INITIAL_GAME_BASE_STATE, // ✅ Використовуємо єдину константу
    gameId: Date.now().toString(), // Новий, унікальний ID для нової гри
  };
};

export const useGameState = (socketRef = { current: null }) => {

  // Ініціалізуємо стан, використовуючи функцію getInitialState
  const [gameState, setGameState] = useState(getInitialState);

  // === 🎯 ЗБЕРЕЖЕННЯ: СИНХРОНІЗАЦІЯ З LOCAL STORAGE ===
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);


  // === ЛОГІКА ОНОВЛЕННЯ СТАНУ ПІСЛЯ УСПІШНОГО ХОДУ ===
  // Виносимо цю функцію, оскільки вона використовується іншими
  const simulateMoveUpdate = useCallback((from, to, piece, newBoard) => {
    setGameState(prev => {
      const newTurn = prev.currentTurn === 'w' ? 'b' : 'w';
      console.log(`[LOCAL SIMULATION] Хід: ${from} -> ${to}. Нова черга: ${newTurn}`);

      return {
        ...prev,
        boardPiecesObject: newBoard,
        currentTurn: newTurn,
        moveHistory: [...prev.moveHistory, { from, to, piece, turn: prev.currentTurn }],
      };
    });
  }, []); // Не залежить від gameState, бо використовує функціональне оновлення


  // 🆕 ЛОГІКА СКИДАННЯ ГРИ
  const resetGameState = useCallback(() => {
    console.log("🔄 Скидання стану гри...");
    clearGameState();
    // Використовуємо setGameState з функцією для ініціалізації
    setGameState(getInitialState());
  }, []);


  // 🆕 ЛОГІКА ОБРОБКИ ОНОВЛЕНЬ ІЗ СЕРВЕРА (Заглушка для повноти)
  const handleServerUpdate = useCallback((newGameState) => {
    console.log("📡 Отримано оновлення стану з сервера.");
    // Тут має бути логіка валідації та застосування
    // setGameState(newGameState); 
  }, []);


  // === ОСНОВНА ЛОГІКА: ОБРОБКА КЛІКУ ===
  const handleSquareClick = useCallback((squareId) => {

    // Використовуємо функціональне оновлення для гарантії актуальності стану
    setGameState(prev => {
      // Деструктуризуємо поточний стан (prev) всередині!
      const { boardPiecesObject, selectedSquare, currentTurn } = prev;

      console.log(`➡️ [CLICK] Клік на клітинці: ${squareId}. Вибрана фігура: ${selectedSquare}`);
      console.log(boardPiecesObject)
      console.log(selectedSquare)
      console.log(currentTurn)
      console.log(squareId)

      const piece = boardPiecesObject[squareId];

      // 1. ПЕРШИЙ КЛІК: ВИБІР ФІГУРИ
      if (selectedSquare === null && piece) {
        console.log(selectedSquare)

        // Перевірка черги
        if (getPieceColor(piece) !== currentTurn) {
          console.warn(`🛑 [ERROR] Спроба ходити не своєю фігурою.`);
          return prev; // Залишаємо попередній стан
        }

        console.log(`✅ [CLICK 1] Вибрано фігуру на ${squareId}.`);
        return { ...prev, selectedSquare: squareId };
      }

      // 2. ДРУГИЙ КЛІК: СПРОБА ЗРОБИТИ ХІД
      else if (selectedSquare !== null) {

        const fromSquare = selectedSquare;
        const toSquare = squareId;

        console.log(`➡️ [CLICK 2] Спроба ходу з ${fromSquare} на ${toSquare}.`);

        // Скидаємо виділення, якщо клікнули на ту саму клітинку
        if (fromSquare === toSquare) {
          console.log("➡️ [DESELECT] Клік на тій самій клітинці. Скидаємо вибір.");
          return { ...prev, selectedSquare: null };
        }

        const pieceToMove = boardPiecesObject[fromSquare];
        const pieceOnTarget = boardPiecesObject[toSquare];

        if (pieceToMove) {

          // ЗАБОРОНА БИТИ СВІЙ КОЛІР
          if (pieceOnTarget && getPieceColor(pieceOnTarget) === getPieceColor(pieceToMove)) {
            console.warn("🛑 [ERROR] Не можна бити фігуру свого кольору. Скидаємо вибір.");
            // Тут за логікою шахів, ми повинні вибрати іншу фігуру, а не просто скинути вибір.
            return { ...prev, selectedSquare: toSquare };
          }

          // 🛑 ПОПЕРЕДЖЕННЯ: Тут повинна бути логіка ВАЛІДНОСТІ ходу (Чи може кінь сюди піти?)
          // Зараз ми дозволяємо будь-який хід
          console.log("🔥 [MOVE] Створення нового стану дошки...");

          // ІМУТАБЕЛЬНЕ ОНОВЛЕННЯ ДОШКИ
          const newBoard = { ...boardPiecesObject };
          delete newBoard[fromSquare];
          newBoard[toSquare] = pieceToMove;

          // Оскільки ми все ще в setGameState, ми не можемо викликати simulateMoveUpdate.
          // Ми повинні виконати логіку оновлення стану ПРЯМО ТУТ:
          const newTurn = currentTurn === 'w' ? 'b' : 'w';

          // Повертаємо новий стан гри (включаючи скидання selectedSquare)
          return {
            ...prev,
            boardPiecesObject: newBoard,
            currentTurn: newTurn,
            moveHistory: [...prev.moveHistory, { from: fromSquare, to: toSquare, piece: pieceToMove, turn: currentTurn }],
            selectedSquare: null, // Скидаємо виділення
          };

        } else {
          console.error(`🛑 [ERROR] Немає фігури на вибраній клітинці ${fromSquare}.`);
        }
      }
      // Якщо ми дісталися сюди, стан не змінюється
      return prev;
    });
  }, []); 

  return {
    gameState,
    handleSquareClick,
    handleServerUpdate, // ✅ Тепер визначено
    resetGameState,     // ✅ Тепер визначено
    // Можливо, варто експортувати simulateMoveUpdate, якщо він потрібен зовні
    simulateMoveUpdate
  };
};