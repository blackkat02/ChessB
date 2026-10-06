import { useState } from 'react';
import ChessBoardContainer from '../../components/ChessBoardContainer/ChessBoardContainer';
import GameInfoPanel from '../../components/GameInfoPanel/GameInfoPanel';
import NewGameModal from '../../components/NewGameModal/NewGameModal';
import GameOverModal from '../../components/GameOverModal/GameOverModal';
import MoveListContainer from '../../components/MoveList/MoveListContainer';
import { useGameState } from '../../hooks/useGameState';
import { COLORS } from '../../redux/game/gameConstants';

const LAYOUT_GRID_CLASSNAME = [
  'grid w-full max-w-6xl gap-6 overflow-x-auto',
  "grid-cols-1 [grid-template-areas:'info'_'board'_'moves']",
  "sm:grid-cols-2 sm:[grid-template-areas:'board_board'_'info_moves']",
  "lg:grid-cols-[280px_minmax(240px,1fr)_320px] lg:[grid-template-areas:'info_board_moves']",
].join(' ');

const HomePage = () => {
  const {
    gameState,
    startNewGame,
    handleTimeUp,
    handleResign,
    handleOfferDraw,
  } = useGameState();
  const [showSquareId, setShowSquareId] = useState(false);
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);
  const [dismissedResultGameId, setDismissedResultGameId] = useState(null);

  const isWhiteTurn = gameState.currentTurn === COLORS.WHITE;
  const isWhiteClockActive = isWhiteTurn && gameState.hasGameStarted;
  const isBlackClockActive = !isWhiteTurn && gameState.hasGameStarted;
  const showGameOverModal =
    gameState.isGameOver &&
    dismissedResultGameId !== gameState.gameId &&
    !isNewGameOpen;

  const openNewGameModal = () => setIsNewGameOpen(true);

  const confirmResign = () => {
    if (window.confirm('Ви точно хочете здатися?')) handleResign();
  };

  // Партнер грає на тому ж пристрої, тож "прийняття" пропозиції нічиєї
  // підтверджуємо тут-таки, замість окремого мережевого запиту.
  const confirmOfferDraw = () => {
    if (window.confirm('Суперник приймає нічию?')) handleOfferDraw();
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
            isWhiteTurn={isWhiteTurn}
            isWhiteClockActive={isWhiteClockActive}
            isBlackClockActive={isBlackClockActive}
            onNewGame={openNewGameModal}
            onTimeUp={handleTimeUp}
            onResign={confirmResign}
            onOfferDraw={confirmOfferDraw}
            showSquareId={showSquareId}
            onToggleSquareId={() => setShowSquareId((v) => !v)}
          />
        </div>

        <div
          style={{ gridArea: 'board' }}
          className="flex min-w-0 items-start justify-center"
        >
          <ChessBoardContainer
            showSquareId={showSquareId}
            flipped={gameState.playerSide === COLORS.BLACK}
          />
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
