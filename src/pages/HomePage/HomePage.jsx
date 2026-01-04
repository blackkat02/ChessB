import React, { useState, useCallback } from 'react';
import ChessBoardContainer from '../../components/ChessBoardContainer/ChessBoardContainer';
import Clock from '../../components/Clock/Clock';
import Button from '../../components/Button/Button';
import styles from './HomePage.module.css';
import { useGameState } from '../../hooks/useGameState';

const HomePage = () => {
  const { gameState, resetGameState } = useGameState(); // Лишаємо тільки те, що треба для годинників та кнопок
  const [showSquareId, setShowSquareId] = useState(false);

  return (
    <div className={styles.homePageWrapper}>
      <h1>Chess MVP (Redux)</h1>

      <div className={styles.clocks}>
        <Clock
          initialTime={gameState.whiteTime}
          color="w"
          isActive={gameState.currentTurn === 'w'}
        />
        <Clock
          initialTime={gameState.blackTime}
          color="b"
          isActive={gameState.currentTurn === 'b'}
        />
      </div>

      {/* ✅ ТЕПЕР ТУТ КОНТЕЙНЕР. Він сам знає, як дістати дошку та кліки */}
      <ChessBoardContainer showSquareId={showSquareId} />

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
