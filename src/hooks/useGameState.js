// src/hooks/useGameState.js

import { useState, useCallback } from 'react';
import { initialBoardPiecesObject } from '../redux/positions';

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


export const useGameState = (socketRef = { current: null }) => {
    const [gameState, setGameState] = useState(INITIAL_GAME_STATE);
    
    // Деструктуризуємо для чистоти та використання в useCallback
    const { boardPiecesObject, selectedSquare, currentTurn } = gameState;

    const simulateMoveUpdate = (from, to, piece, newBoard) => {
        setGameState(prev => {
            const newTurn = prev.currentTurn === 'w' ? 'b' : 'w';

            console.log(`[LOCAL SIMULATION] Хід: ${from} -> ${to}. Нова черга: ${newTurn}`);

            return {
                ...prev,
                boardPiecesObject: newBoard,
                currentTurn: newTurn,
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
                return; // Забороняємо вибір та виходимо з функції
            }

            // Дозволяємо виділення, якщо це фігура поточного гравця
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

            // !!! ВИДАЛЕНО: ЛОГІКА currentTurn ТА prev НЕ МОЖЕ БУТИ ТУТ !!!
            // Ти вніс її тут некоректно, тому вона викликала ReferenceError. Її місце – у simulateMoveUpdate.

            if (pieceToMove) {
                // ІМУТАБЕЛЬНЕ ОНОВЛЕННЯ ДОШКИ
                const newBoard = { ...boardPiecesObject };
                delete newBoard[fromSquare];
                newBoard[toSquare] = pieceToMove;
                
                // === ВИКЛИК ЛОКАЛЬНОЇ СИМУЛЯЦІЇ (ОНОВИТЬ СТАН) ===
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