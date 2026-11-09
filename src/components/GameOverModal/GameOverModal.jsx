import Button from '../Button/Button';
import { COLORS } from '../../redux/game/gameConstants';

const REASON_TITLE = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  timeout: 'Time out',
  resignation: 'Resignation',
  'draw-agreement': 'Draw by agreement',
};

const winnerSubtitle = (winner) => {
  if (winner === COLORS.WHITE) return 'White wins';
  if (winner === COLORS.BLACK) return 'Black wins';
  return 'Draw';
};

const GameOverModal = ({ isOpen, winner, reason, onNewGame, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-ui"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-card border border-border bg-surface p-6 text-center shadow-btn"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-fg">{REASON_TITLE[reason] ?? 'Game over'}</h2>
        <p className="mt-1 text-fg-subtle">{winnerSubtitle(winner)}</p>

        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" onClick={onNewGame} className="w-full">
            New game
          </Button>
          <Button onClick={onClose} className="w-full">
            View board
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
