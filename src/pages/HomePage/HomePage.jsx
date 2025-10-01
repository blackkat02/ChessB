import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
// import { initialPosition } from '../../redux/positionsSlice'; 
import ChessBoardView from '../../components/ChessBoardView/ChessBoardView';
import Clock from '../../components/Clock/Clock';
import Button from '../../components/Button/Button';
import styles from './HomePage.module.css';

const HomePage = () => {
  const [showSquareId, setShowSquareId] = useState(false);

  const currentTurn = 'w'; // Отримати з WebSocket
  const whiteTime = 120000; // Отримати з WebSocket (120 секунд)
  const blackTime = 120000;

  const handleShowId = () => {
    setShowSquareId(true);
  };

  const handleHideId = () => {
    setShowSquareId(false);
  };

  return (
    <div className={styles.homePageWrapper}>
      <h1>Chess MVP</h1>

      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {/* Годинник Чорних зверху (традиційне розташування) */}
        <Clock
          initialTime={blackTime}
          color="b"
          isActive={currentTurn === 'b'}
          onTimeUp={() => handleTimeUp('b')}
        />

        {/* Годинник Білих знизу */}
        <Clock
          initialTime={whiteTime}
          color="w"
          isActive={currentTurn === 'w'}
          onTimeUp={() => handleTimeUp('w')}
        />
      </div>

      <ChessBoardView showSquareId={showSquareId} />

      <div className={styles.buttonGroup}>
        <Button
          onClick={handleShowId}
          id="show-id-button"
          className={styles.primaryButton}
        >
          Показати назву поля
        </Button>
        <Button
          onClick={handleHideId}
          id="hide-id-button"
          className={styles.secondaryButton}
        >
          Приховати назву поля
        </Button>
      </div>
    </div>
  );
};

export default HomePage;