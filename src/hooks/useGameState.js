import { useState, useCallback, useEffect } from 'react';
import { initialBoardPiecesObject } from '../data/positions';
import { loadGameState, saveGameState, clearGameState } from '../storage/localStorageService';

// Єдине Джерело Істини
const INITIAL_GAME_STATE = {
  boardPiecesObject: initialBoardPiecesObject,
  selectedSquare: null,
  whiteTime: 180000,
  blackTime: 180000,
  currentTurn: 'w',
  gameId: 'test-game-123',
  moveHistory: [],
};

// Функція для визначення кольору фігури
const getPieceColor = (pieceSymbol) => {
  return pieceSymbol ? pieceSymbol[0] : null;
};

// ВІДНОВЛЕННЯ СТАНУ З LOCAL STORAGE (або використання початкового)
const getInitialState = (initialBoardPiecesObject) => {
  const savedState = loadGameState();

  if (savedState && savedState.gameId) {
    console.log("💾 Завантажено збережений локальний стан.");
    return savedState;
  }

  console.log("🆕 Початковий стан гри ініціалізовано.");

  return {
    boardPiecesObject: initialBoardPiecesObject,
    selectedSquare: null,
    whiteTime: 180000,
    blackTime: 180000,
    currentTurn: 'w',
    gameId: Date.now().toString(), // Новий, унікальний ID для нової гри
    moveHistory: [],
  };
};

export const useGameState = (socketRef = { current: null }) => {

  const [gameState, setGameState] = useState(() => getInitialState(initialBoardPiecesObject));
  const { boardPiecesObject, selectedSquare, currentTurn } = gameState;

  // === 🎯 ЗБЕРЕЖЕННЯ: СИНХРОНІЗАЦІЯ З LOCAL STORAGE ===
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  const simulateMoveUpdate = (from, to, piece, newBoard) => {
    setGameState(prev => {
      const newTurn = prev.currentTurn === 'w' ? 'b' : 'w';

      // ... (об'єкт newMove) ...

      console.log(`[LOCAL SIMULATION] Хід: ${from} -> ${to}. Нова черга: ${newTurn}`);

      return {
        ...prev,
        boardPiecesObject: newBoard,
        currentTurn: newTurn,
        moveHistory: [...prev.moveHistory, { from, to, piece, turn: prev.currentTurn }],
      };
    });
  };

  // 🆕 ЛОГІКА СКИДАННЯ ГРИ
  const resetGameState = useCallback(() => {
    console.log("🔄 Скидання стану гри...");
    // Очистити локальне сховище
    clearGameState();
    // Встановити початковий стан (згенерувавши новий gameId, щоб не конфліктувати зі старим)
    setGameState(getInitialState(initialBoardPiecesObject));
  }, []);

  // 🆕 ЛОГІКА ОБРОБКИ ОНОВЛЕНЬ ІЗ СЕРВЕРА (Заглушка)
  const handleServerUpdate = useCallback((newGameState) => {
    console.log("📡 Отримано оновлення стану з сервера.");
    // В реальній грі: setGameState(newGameState);
  }, []);

  // === ОСНОВНА ЛОГІКА: ОБРОБКА КЛІКУ ===
  const handleSquareClick = useCallback((squareId) => {

    // 🆕 ЛОГ 1: Загальний лог для входу в функцію
    console.log(`➡️ [CLICK] Клік на клітинці: ${squareId}. Вибрана фігура: ${selectedSquare}`);

    const piece = boardPiecesObject[squareId];

    // 1. ПЕРШИЙ КЛІК: ВИБІР ФІГУРИ
    if (selectedSquare === null && piece) {

      // ... (перевірка черги) ...

      setGameState(prev => ({ ...prev, selectedSquare: squareId }));
      console.log(`✅ [CLICK 1] Вибрано фігуру на ${squareId}.`);

    }

    // 2. ДРУГИЙ КЛІК: СПРОБА ЗРОБИТИ ХІД
    else if (selectedSquare !== null) {

      const fromSquare = selectedSquare;
      const toSquare = squareId;

      // 🆕 ЛОГ 2: Перевірка, чи ввійшли ми у блок другого кліку
      console.log(`➡️ [CLICK 2] Спроба ходу з ${fromSquare} на ${toSquare}.`);

      // Скидаємо виділення, якщо клікнули на ту саму клітинку
      if (fromSquare === toSquare) {
        console.log("➡️ [DESELECT] Клік на тій самій клітинці. Скидаємо вибір.");
        setGameState(prev => ({ ...prev, selectedSquare: null }));
        return;
      }

      const pieceToMove = boardPiecesObject[fromSquare];
      const pieceOnTarget = boardPiecesObject[toSquare];

      if (pieceToMove) {
        // ... (НОВИЙ КОНТРОЛЬ: ЗАБОРОНА БИТИ СВІЙ КОЛІР) ...

        if (pieceOnTarget && getPieceColor(pieceOnTarget) === getPieceColor(pieceToMove)) {
          // ... (логіка помилки, скидання selectedSquare: null) ...
          return;
        }

        // 🆕 ЛОГ 3: Якщо ми дісталися сюди, то хід дозволено (за локальною логікою)
        console.log("🔥 [MOVE] Створення нового стану дошки...");

        // ІМУТАБЕЛЬНЕ ОНОВЛЕННЯ ДОШКИ
        const newBoard = { ...boardPiecesObject };
        delete newBoard[fromSquare];
        newBoard[toSquare] = pieceToMove;

        // ВИКЛИК ЛОКАЛЬНОЇ СИМУЛЯЦІЇ (ОНОВИТЬ СТАН)
        simulateMoveUpdate(fromSquare, toSquare, pieceToMove, newBoard);
      } else {
        // 🆕 ЛОГ 4: Якщо з fromSquare зникла фігура (має бути помилка)
        console.error(`🛑 [ERROR] Немає фігури на вибраній клітинці ${fromSquare}.`);
      }

      // Завжди скидаємо виділення після спроби ходу
      setGameState(prev => ({ ...prev, selectedSquare: null }));
    }

    // Залежності повинні включати ВСЕ, що використовується ЗОВНІ setGameState
    // Залишаємо залежності, оскільки вони коректні
  }, [boardPiecesObject, selectedSquare, currentTurn, simulateMoveUpdate]);
  return {
    gameState,
    handleSquareClick,
    handleServerUpdate, // <--- ТЕПЕР ВОНА ВИЗНАЧЕНА
    resetGameState // <--- ТЕПЕР ВОНА ВИЗНАЧЕНА
  };
};