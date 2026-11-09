import clsx from 'clsx';
import Button from '../Button/Button';
import { COLORS } from '../../redux/game/gameConstants';

const GameInfoPanel = ({
  gameState,
  uiState,
  isWhiteTurn,
  onNewGame,
  onResign,
  onOfferDraw,
  showSquareId,
  onToggleSquareId,
}) => {
  const playerSideLabel =
    uiState.playerSide === COLORS.WHITE ? 'White' : 'Black';
  // Resign/запропонувати нічию має сенс лише поки партія триває.
  const canOfferGameActions = gameState.hasGameStarted && !gameState.isGameOver;

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
        {isWhiteTurn ? 'White' : 'Black'} to move
      </p>

      <div className="rounded-control bg-surface-sunk px-3 py-2 text-sm text-fg-subtle">
        <p>Casual game #{gameState.gameId + 1}</p>
        <p>You play as {playerSideLabel}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 lg:flex-col">
        <Button
          variant="primary"
          onClick={onNewGame}
          className="lg:w-full"
          children={undefined}
          id={undefined}
        >
          New game
        </Button>
        {canOfferGameActions && (
          <>
            <Button
              onClick={onOfferDraw}
              className="lg:w-full"
              children={undefined}
              id={undefined}
            >
              Offer draw
            </Button>
            <Button
              variant="danger"
              onClick={onResign}
              className="lg:w-full"
              children={undefined}
              id={undefined}
            >
              Resign
            </Button>
          </>
        )}
        <Button
          onClick={onToggleSquareId}
          className="lg:w-full"
          children={undefined}
          id={undefined}
        >
          {showSquareId ? 'Hide coordinates' : 'Show coordinates'}
        </Button>
      </div>
    </div>
  );
};

export default GameInfoPanel;
