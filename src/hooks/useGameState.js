// src/hooks/useGameState.js

import { useState, useCallback, useEffect } from 'react'; // <--- ДОДАНО useEffect!
import { initialBoardPiecesObject } from '../data/positions';
import { loadGameState, saveGameState } from '../storage/localStorageService';

// Єдине Джерело Істини
const INITIAL_GAME_STATE = {
    boardPiecesObject: initialBoardPiecesObject,
    selectedSquare: null,
    whiteTime: 180000,
    blackTime: 180000,
    currentTurn: 'w',
    gameId: 'test-game-123',
};

// Функція для визначення кольору фігури
const getPieceColor = (pieceSymbol) => {
    return pieceSymbol ? pieceSymbol[0] : null;
};

// ВІДНОВЛЕННЯ СТАНУ З LOCAL STORAGE (або використання початкового)
const getInitialState = (initialBoardPiecesObject) => {
    // 1. Спроба завантажити стан через сервіс
    const savedState = loadGameState(); 
    
    // Якщо loadGameState повернув стан І цей стан має gameId (щоб уникнути старих/пошкоджених записів)
    if (savedState && savedState.gameId) { 
        console.log("💾 Завантажено збережений локальний стан.");
        // Повертаємо збережений стан
        return savedState; 
    }

    // =========================================================
    // 🎯 ВИПРАВЛЕННЯ СИНТАКСИСУ: Виконується, якщо savedState НЕ знайдено.
    // =========================================================
    console.log("🆕 Початковий стан гри ініціалізовано.");
    
    // Повертаємо початковий стан, використовуючи властивості з INITIAL_GAME_STATE 
    // та додаючи необхідні для нової гри параметри (unique gameId, empty moveHistory)
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
    
    // =================================================================
    // 🎯 ВИПРАВЛЕННЯ: Тепер useState використовує функцію-ініціалізатор!
    // =================================================================
    const [gameState, setGameState] = useState(() => getInitialState(initialBoardPiecesObject));
    
    // Деструктуризуємо для чистоти та використання в useCallback
    // Після виправлення this line: const { boardPiecesObject, selectedSquare, currentTurn } = gameState;
    const { boardPiecesObject, selectedSquare, currentTurn } = gameState;

    // === 🎯 ЗБЕРЕЖЕННЯ: СИНХРОНІЗАЦІЯ З LOCAL STORAGE ===
    useEffect(() => {
        // saveGameState викликається при кожній зміні gameState
        saveGameState(gameState);
    }, [gameState]);

    const simulateMoveUpdate = (from, to, piece, newBoard) => {
        setGameState(prev => {
            const newTurn = prev.currentTurn === 'w' ? 'b' : 'w';

            const newMove = {
                id: prev.moveHistory.length + 1,
                from: from,
                to: to,
                piece: piece,
                turn: prev.currentTurn,
                // whiteTime: prev.whiteTime, // Додай, коли буде логіка таймера
                // blackTime: prev.blackTime
            };

            console.log(`[LOCAL SIMULATION] Хід: ${from} -> ${to}. Нова черга: ${newTurn}`);
            
            return {
                ...prev,
                boardPiecesObject: newBoard,
                currentTurn: newTurn,
                moveHistory: [...prev.moveHistory, newMove], // <--- ДОДАНО: Збереження історії ходів
            };
        });
    };


    // === ОСНОВНА ЛОГІКА: ОБРОБКА КЛІКУ ===
    const handleSquareClick = useCallback((squareId) => {
        const piece = boardPiecesObject[squareId];

        // 1. ПЕРШИЙ КЛІК: ВИБІР ФІГУРИ
        if (selectedSquare === null && piece) {
            const pieceColor = getPieceColor(piece);
            
            // ПЕРЕВІРКА ЧЕРГИ: ЗАБОРОНА ВИБОРУ ЧУЖОЇ ФІГУРИ
            if (pieceColor !== currentTurn) {
                console.warn(`Хід гравця ${currentTurn}. Не можна вибрати фігуру кольору ${pieceColor}.`);
                return;
            }

            setGameState(prev => ({ ...prev, selectedSquare: squareId }));
        }

        // 2. ДРУГИЙ КЛІК: СПРОБА ЗРОБИТИ ХІД
        else if (selectedSquare !== null) {
            const fromSquare = selectedSquare;
            const toSquare = squareId;

            // Скидаємо виділення, якщо клікнули на ту саму клітинку
            if (fromSquare === toSquare) {
                setGameState(prev => ({ ...prev, selectedSquare: null }));
                return;
            }

            const pieceToMove = boardPiecesObject[fromSquare];
            const pieceOnTarget = boardPiecesObject[toSquare]; // <--- Фігура на клітинці призначення

            if (pieceToMove) {
                
                // === НОВИЙ КОНТРОЛЬ: ЗАБОРОНА БИТИ СВІЙ КОЛІР ===
                if (pieceOnTarget) {
                    const targetPieceColor = getPieceColor(pieceOnTarget);
                    const movingPieceColor = getPieceColor(pieceToMove);

                    if (targetPieceColor === movingPieceColor) {
                        console.warn(`Неможливий хід: Не можна бити фігуру свого кольору (${targetPieceColor}).`);
                        
                        // Ми НЕ робимо хід, але перемикаємо виділення (залишаємо виділеною нову фігуру)
                        // Або скидаємо виділення. Тут вирішено скинути для простоти.
                        setGameState(prev => ({ ...prev, selectedSquare: null }));
                        return;
                    }
                }
                // ===============================================
                
                // ІМУТАБЕЛЬНЕ ОНОВЛЕННЯ ДОШКИ
                const newBoard = { ...boardPiecesObject };
                delete newBoard[fromSquare]; 
                newBoard[toSquare] = pieceToMove;
                
                // ВИКЛИК ЛОКАЛЬНОЇ СИМУЛЯЦІЇ (ОНОВИТЬ СТАН)
                simulateMoveUpdate(fromSquare, toSquare, pieceToMove, newBoard);
            } else {
                console.warn(`Немає фігури на ${fromSquare}.`);
            }

            // Завжди скидаємо виділення після спроби ходу
            setGameState(prev => ({ ...prev, selectedSquare: null }));
        }

    // Залежності повинні включати ВСЕ, що використовується ЗОВНІ setGameState
    }, [boardPiecesObject, selectedSquare, currentTurn, simulateMoveUpdate]); 

    
    const handleServerUpdate = useCallback(() => {
        // Логіка оновлення стану гри, часу та черги
    }, []);

    return { gameState, handleSquareClick, handleServerUpdate };
};