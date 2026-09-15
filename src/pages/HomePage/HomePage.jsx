import React, { useState } from 'react';
import clsx from 'clsx';
import ChessBoardContainer from '../../components/ChessBoardContainer/ChessBoardContainer';
import Clock from '../../components/Clock/Clock';
import Button from '../../components/Button/Button';
import { useGameState } from '../../hooks/useGameState';
import { COLORS } from '../../redux/game/gameConstants';

const HomePage = () => {
  const { gameState, resetGameState } = useGameState();
  const [showSquareId, setShowSquareId] = useState(false);

  const isWhiteTurn = gameState.currentTurn === COLORS.WHITE;
  const isWhiteClockActive = isWhiteTurn && gameState.hasGameStarted;
  const isBlackClockActive = !isWhiteTurn && gameState.hasGameStarted;

  return (
    <div className="flex flex-col items-center gap-6 py-6 font-ui">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Chess <span className="text-accent">MVP</span>
        </h1>
        <p
          className={clsx(
            'mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold',
            isWhiteTurn
              ? 'bg-turn-white-bg text-turn-white-fg'
              : 'bg-turn-black-bg text-turn-black-fg'
          )}
        >
          <span
            className={clsx(
              'h-2.5 w-2.5 rounded-full',
              isWhiteTurn ? 'bg-piece-white ring-1 ring-border' : 'bg-piece-black'
            )}
          />
          Хід {isWhiteTurn ? 'білих' : 'чорних'}
        </p>
      </header>

      <div className="flex w-full max-w-lg items-center justify-center gap-4 sm:justify-between">
        <Clock
          initialTime={gameState.whiteTime}
          color={COLORS.WHITE}
          isActive={isWhiteClockActive}
        />
        <Clock
          initialTime={gameState.blackTime}
          color={COLORS.BLACK}
          isActive={isBlackClockActive}
        />
      </div>

      <ChessBoardContainer showSquareId={showSquareId} />

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="danger" onClick={resetGameState}>
          Скинути гру
        </Button>
        <Button onClick={() => setShowSquareId((v) => !v)}>
          {showSquareId ? 'Приховати нотації' : 'Показати нотації'}
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
