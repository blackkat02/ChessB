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
  } = useGameState(socketRef);

  // Стан лише для UI (Керується локально)
  const [showSquareId, setShowSquareId] = useState(false);

  // Функція-заглушка для обробки закінчення часу
  const handleTimeUp = useCallback((color) => {
    console.log(`[GAME OVER] Час гравця ${color} вичерпано!`);
  }, []);

  // === ЛОГІКА: Скидання гри ===
  const handleResetGame = useCallback(() => {
    resetGameState();
  }, [resetGameState]);

  // === ЛОГІКА: Тоггл нотацій полів ===
  const handleToggleId = () => {
    setShowSquareId(prev => !prev);
  };


  return (
    <div className={styles.homePageWrapper}>
      <h1>Chess MVP (Controlled)</h1>

      <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', maxWidth: '600px' }}>
        {/* Годинник Білих: звертаємося напряму до gameState */}
        <Clock
          initialTime={gameState.whiteTime}
          color="w"
          isActive={gameState.currentTurn === 'w'}
          onTimeUp={handleTimeUp}
        />

        {/* Годинник Чорних: звертаємося напряму до gameState */}
        <Clock
          initialTime={gameState.blackTime}
          color="b"
          isActive={gameState.currentTurn === 'b'}
          onTimeUp={handleTimeUp}
        />
      </div>

      {/* Дошка: отримує СТАН і КЛІК з хука */}
      <ChessBoardView
        showSquareId={showSquareId}
        boardPiecesObject={gameState.boardPiecesObject} // Передаємо поточний стан
        selectedSquare={gameState.selectedSquare}       // Передаємо виділену клітинку
        onClick={handleSquareClick}                     // Передаємо єдиний обробник
      />

      <div className={styles.buttonGroup}>

        {/* Кнопка СКИДАННЯ */}
        <Button
          onClick={handleResetGame}
          className={styles.danger}
        >
          Скинути гру
        </Button>

        {/* Тоггл-кнопка */}
        <Button
          onClick={handleToggleId}
          className={showSquareId ? styles.primary : ''}
        >
          {showSquareId ? 'Приховати нотації' : 'Показати нотації'}
        </Button>
      </div>
    </div>
  );
};

export default HomePage;