import React, { useState, useRef, useCallback } from 'react';
import ChessBoardView from '../../components/ChessBoardView/ChessBoardView';
import Clock from '../../components/Clock/Clock';
import Button from '../../components/Button/Button';
import styles from './HomePage.module.css';

// === ІМПОРТУЄМО НАШ КАСТОМНИЙ ХУК ===
import { useGameState } from '../../hooks/useGameState';

const HomePage = () => {
  // 1. WebSocket (залишаємо для майбутнього використання)
  const socketRef = useRef(null);

  // 2. === ЄДИНЕ ДЖЕРЕЛО ІСТИНИ ===
  const {
    gameState,
    handleSquareClick,
    resetGameState
    // handleServerUpdate // Звісно, ти не забув, що це буде потрібно
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
  }, []);

  // === 🆕 НОВА ЛОГІКА: Скидання гри ===
  const handleResetGame = useCallback(() => {
        resetGameState(); // <--- ВИКЛИКАЄМО ЛИШЕ ЧИСТУ ЛОГІКУ ХУКА!
        // ВИДАЛИТИ: window.location.reload(); 
        // ВИДАЛИТИ: console.warn("...");
    }, [resetGameState]); 

  // === 🆕 НОВА ЛОГІКА: Тоггл нотацій полів ===
  const handleToggleId = () => {
    setShowSquareId(prev => !prev);
  };


  return (
    <div className={styles.homePageWrapper}>
      <h1>Chess MVP (Controlled)</h1>

      <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', maxWidth: '600px' }}>
        {/* Годинник Чорних: використовує СТАН з хука */}
        <Clock
          initialTime={whiteTime}
          color="w"
          isActive={currentTurn === 'w'}
          onTimeUp={handleTimeUp}
        />

        {/* Годинник Білих: використовує СТАН з хука */}
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

        {/* 🆕 Кнопка СКИДАННЯ (Використовуємо клас danger) */}
        <Button
          onClick={handleResetGame}
          className={styles.danger}
        >
          Скинути гру
        </Button>

        {/* 🆕 Тоггл-кнопка (Використовуємо клас primary) */}
        <Button
          onClick={handleToggleId}
          className={showSquareId ? styles.primary : ''} // Підсвічуємо, коли активно
        >
          {showSquareId ? 'Приховати нотації' : 'Показати нотації'}
        </Button>
      </div>
    </div>
  );
};

export default HomePage;