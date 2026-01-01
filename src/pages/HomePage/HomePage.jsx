// src/pages/HomePage/HomePage.jsx
import React, { useState, useCallback } from 'react';
import ChessBoardView from '../../components/ChessBoardView/ChessBoardView';
import Clock from '../../components/Clock/Clock';
import Button from '../../components/Button/Button';
import styles from './HomePage.module.css';
import { useGameState } from '../../hooks/useGameState';

const HomePage = () => {
  const { gameState, handleSquareClick, resetGameState } = useGameState();
  const [showSquareId, setShowSquareId] = useState(false);

  const handleTimeUp = useCallback((color) => {
    console.log(`[GAME OVER] Час гравця ${color} вичерпано!`);
  }, []);

  return (
    <div className={styles.homePageWrapper}>
      <h1>Chess MVP (Redux Controlled)</h1>

      <div className={styles.clocks}>
        <Clock
          initialTime={gameState.whiteTime}
          color="w"
          isActive={gameState.currentTurn === 'w'}
          onTimeUp={handleTimeUp}
        />
        <Clock
          initialTime={gameState.blackTime}
          color="b"
          isActive={gameState.currentTurn === 'b'}
          onTimeUp={handleTimeUp}
        />
      </div>

      <ChessBoardView
        showSquareId={showSquareId}
        boardPiecesObject={gameState.boardPiecesObject}
        selectedSquare={gameState.selectedSquare}
        onClick={handleSquareClick}
      />

      <div className={styles.buttonGroup}>
        <Button onClick={resetGameState} className={styles.danger}>
          Скинути гру
        </Button>
        <Button onClick={() => setShowSquareId(!showSquareId)}>
          {showSquareId ? 'Приховати нотації' : 'Показати нотації'}
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
