import { useState } from 'react';
import ChessBoardContainer from '../../components/ChessBoardContainer/ChessBoardContainer';
import Clock from '../../components/Clock/Clock';
import GameInfoPanel from '../../components/GameInfoPanel/GameInfoPanel';
import NewGameModal from '../../components/NewGameModal/NewGameModal';
import GameOverModal from '../../components/GameOverModal/GameOverModal';
import MoveListContainer from '../../components/MoveList/MoveListContainer';
import { useGameState } from '../../hooks/useGameState';
import { COLORS } from '../../redux/game/gameConstants';

const LAYOUT_GRID_CLASSNAME = [
  'grid w-full max-w-6xl gap-6 overflow-x-auto',
  "grid-cols-1 [grid-template-areas:'board'_'info'_'moves']",
  "sm:grid-cols-2 sm:[grid-template-areas:'board_board'_'info_moves']",
  "lg:grid-cols-[280px_minmax(240px,1fr)_320px] lg:[grid-template-areas:'info_board_moves']",
].join(' ');

const HomePage = () => {
  const {
    gameState,
    uiState,
    startNewGame,
    handleTimeUp,
    handleResign,
    handleOfferDraw,
  } = useGameState();
  const [showSquareId, setShowSquareId] = useState(false);
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);
  const [dismissedResultGameId, setDismissedResultGameId] = useState(null);

  const isWhiteTurn = gameState.currentTurn === COLORS.WHITE;
  const isFlipped = uiState.playerSide === COLORS.BLACK;
  // Верхній годинник — сторони, що сидить зверху дошки (суперник), нижній — ваш.
  const topColor = isFlipped ? COLORS.WHITE : COLORS.BLACK;
  const bottomColor = isFlipped ? COLORS.BLACK : COLORS.WHITE;

  const renderClock = (color) => (
    // Годинник фіксованої ширини, притиснутий до правого краю дошки.
    <div className="flex w-full max-w-[var(--c-board-max-width)] justify-end">
      <Clock
        key={`${color}-${gameState.gameId}`}
        storedMs={color === COLORS.WHITE ? gameState.whiteTime : gameState.blackTime}
        turnStartedAt={gameState.turnStartedAt}
        color={color}
        isActive={gameState.hasGameStarted && gameState.currentTurn === color}
        isGameOver={gameState.isGameOver}
        onTimeUp={handleTimeUp}
      />
    </div>
  );
  const showGameOverModal =
    gameState.isGameOver &&
    dismissedResultGameId !== gameState.gameId &&
    !isNewGameOpen;

  const openNewGameModal = () => setIsNewGameOpen(true);

  const confirmResign = () => {
    if (window.confirm('Are you sure you want to resign?')) handleResign();
  };

  // Партнер грає на тому ж пристрої, тож "прийняття" пропозиції нічиєї
  // підтверджуємо тут-таки, замість окремого мережевого запиту.
  const confirmOfferDraw = () => {
    if (window.confirm('Does your opponent accept the draw?')) handleOfferDraw();
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6 font-ui">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Chess <span className="text-accent">MVP</span>
        </h1>
      </header>

      <div className={LAYOUT_GRID_CLASSNAME}>
        <div style={{ gridArea: 'info' }} className="lg:self-start">
          <GameInfoPanel
            gameState={gameState}
            uiState={uiState}
            isWhiteTurn={isWhiteTurn}
            onNewGame={openNewGameModal}
            onResign={confirmResign}
            onOfferDraw={confirmOfferDraw}
            showSquareId={showSquareId}
            onToggleSquareId={() => setShowSquareId((v) => !v)}
          />
        </div>

        <div
          style={{ gridArea: 'board' }}
          className="flex min-w-0 flex-col items-center gap-2"
        >
          {renderClock(topColor)}
          <ChessBoardContainer showSquareId={showSquareId} flipped={isFlipped} />
          {renderClock(bottomColor)}
        </div>

        <div style={{ gridArea: 'moves' }} className="min-w-0 min-h-0">
          <MoveListContainer />
        </div>
      </div>

      <NewGameModal
        isOpen={isNewGameOpen}
        onClose={() => setIsNewGameOpen(false)}
        onStart={startNewGame}
        hasGameStarted={gameState.hasGameStarted}
      />

      <GameOverModal
        isOpen={showGameOverModal}
        winner={gameState.winner}
        reason={gameState.reason}
        onNewGame={openNewGameModal}
        onClose={() => setDismissedResultGameId(gameState.gameId)}
      />
    </div>
  );
};

export default HomePage;
