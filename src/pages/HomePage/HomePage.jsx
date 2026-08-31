import React, { useState } from 'react';
import clsx from 'clsx';
import ChessBoardContainer from '../../components/ChessBoardContainer/ChessBoardContainer';
import Clock from '../../components/Clock/Clock';
import Button from '../../components/Button/Button';
import { useGameState } from '../../hooks/useGameState';

const HomePage = () => {
  const { gameState, resetGameState } = useGameState();
  const [showSquareId, setShowSquareId] = useState(false);

  const isWhiteTurn = gameState.currentTurn === 'w';

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Chess <span className="text-brand">MVP</span>
        </h1>
        <p
          className={clsx(
            'mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold',
            isWhiteTurn
              ? 'bg-neutral-100 text-neutral-700'
              : 'bg-neutral-800 text-neutral-50'
          )}
        >
          <span
            className={clsx(
              'h-2.5 w-2.5 rounded-full',
              isWhiteTurn ? 'bg-white ring-1 ring-neutral-400' : 'bg-neutral-900'
            )}
          />
          Хід {isWhiteTurn ? 'білих' : 'чорних'}
        </p>
      </header>

      <div className="flex w-full max-w-lg items-center justify-center gap-4 sm:justify-between">
        <Clock
          initialTime={gameState.whiteTime}
          color="w"
          isActive={isWhiteTurn}
        />
        <Clock
          initialTime={gameState.blackTime}
          color="b"
          isActive={!isWhiteTurn}
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
