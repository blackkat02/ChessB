// src/components/HomePage/HomePage.jsх
import React, { useState, useRef, useCallback } from 'react';
// === ВИДАЛЯЄМО: useDispatch та import { initialPosition } ===
import ChessBoardView from '../../components/ChessBoardView/ChessBoardView';
import Clock from '../../components/Clock/Clock';
import Button from '../../components/Button/Button';
import styles from './HomePage.module.css';

// === ІМПОРТУЄМО НАШ КАСТОМНИЙ ХУК ===
import { useGameState } from '../../hooks/useGameState'; 
// Припустимо, що ти створив файл ../../hooks/useGameState.js

const HomePage = () => {
    // 1. WebSocket (залишаємо для майбутнього використання)
    // У реальному додатку useRef та useEffect для сокета були б тут.
    const socketRef = useRef(null); 
    
    // 2. === ЄДИНЕ ДЖЕРЕЛО ІСТИНИ ===
    // Увесь стан гри, час та логіка ходів тепер тут
    const { 
        gameState, 
        handleSquareClick, 
        // handleServerUpdate // Можна додати, якщо ти хочеш керувати socket.onmessage тут
    } = useGameState(socketRef); 
    
    // Деструктуризація для чистоти коду
    const { 
        boardPiecesObject, 
        selectedSquare, 
        whiteTime, 
        blackTime, 
        currentTurn 
    } = gameState;

    // Стан лише для UI (Керується локально)
    const [showSquareId, setShowSquareId] = useState(false);

    // Функція-заглушка для обробки закінчення часу
    const handleTimeUp = useCallback((color) => {
        console.log(`[GAME OVER] Час гравця ${color} вичерпано!`);
        // Тут буде логіка: відправити на сервер повідомлення про технічну поразку
    }, []);

    const handleShowId = () => {
        setShowSquareId(true);
    };

    const handleHideId = () => {
        setShowSquareId(false);
    };

    return (
        <div className={styles.homePageWrapper}>
            <h1>Chess MVP (Controlled)</h1>

            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {/* Годинник Чорних: використовує СТАН з хука */}
               
                {/* Годинник Білих: використовує СТАН з хука */}
                <Clock
                    initialTime={whiteTime}
                    color="w"
                    isActive={currentTurn === 'w'}
                    onTimeUp={handleTimeUp}
                />

                 <Clock
                    initialTime={blackTime}
                    color="b"
                    isActive={currentTurn === 'b'}
                    onTimeUp={handleTimeUp} 
                />

            </div>

            {/* Дошка: отримує СТАН і КЛІК з хука */}
            <ChessBoardView 
                showSquareId={showSquareId} 
                boardPiecesObject={boardPiecesObject} // Передаємо поточний стан
                selectedSquare={selectedSquare}       // Передаємо виділену клітинку
                onClick={handleSquareClick}           // Передаємо єдиний обробник
            />

            <div className={styles.buttonGroup}>
                <Button onClick={handleShowId} id="show-id-button" className={styles.primaryButton}>
                    Показати назву поля
                </Button>
                <Button onClick={handleHideId} id="hide-id-button" className={styles.secondaryButton}>
                    Приховати назву поля
                </Button>
            </div>
        </div>
    );
};

export default HomePage;