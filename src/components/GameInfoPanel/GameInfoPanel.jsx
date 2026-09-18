import clsx from 'clsx';
import Clock from '../Clock/Clock';
import Button from '../Button/Button';
import { COLORS } from '../../redux/game/gameConstants';

const GameInfoPanel = ({
  gameState,
  isWhiteTurn,
  isWhiteClockActive,
  isBlackClockActive,
  onNewGame,
  onTimeUp,
  showSquareId,
  onToggleSquareId,
}) => {
  const playerSideLabel = gameState.playerSide === COLORS.WHITE ? 'білими' : 'чорними';

  return (
    <div className="flex w-full flex-col gap-4 rounded-card border border-border bg-surface p-4 font-ui shadow-btn">
      <p
        className={clsx(
          'inline-flex w-fit items-center gap-2 self-center rounded-full px-4 py-1 text-sm font-semibold lg:self-start',
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

      <div className="flex flex-wrap items-center justify-center gap-3 lg:flex-col lg:items-stretch">
        <Clock
          key={`white-${gameState.gameId}`}
          initialTime={gameState.whiteTime}
          color={COLORS.WHITE}
          isActive={isWhiteClockActive}
          isGameOver={gameState.isGameOver}
          onTimeUp={onTimeUp}
        />
        <Clock
          key={`black-${gameState.gameId}`}
          initialTime={gameState.blackTime}
          color={COLORS.BLACK}
          isActive={isBlackClockActive}
          isGameOver={gameState.isGameOver}
          onTimeUp={onTimeUp}
        />
      </div>

      <div className="rounded-control bg-surface-sunk px-3 py-2 text-sm text-fg-subtle">
        <p>Товариська партія №{gameState.gameId + 1}</p>
        <p>Ви граєте {playerSideLabel}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 lg:flex-col">
        <Button variant="primary" onClick={onNewGame} className="lg:w-full">
          Нова гра
        </Button>
        <Button onClick={onToggleSquareId} className="lg:w-full">
          {showSquareId ? 'Приховати нотації' : 'Показати нотації'}
        </Button>
      </div>
    </div>
  );
};

export default GameInfoPanel;
