import Button from '../Button/Button';
import { COLORS } from '../../redux/game/gameConstants';

const REASON_TITLE = {
  checkmate: 'Мат',
  stalemate: 'Пат',
  timeout: 'Час вичерпано',
};

const winnerSubtitle = (winner) => {
  if (winner === COLORS.WHITE) return 'Перемога білих';
  if (winner === COLORS.BLACK) return 'Перемога чорних';
  return 'Нічия';
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
        <h2 className="text-2xl font-bold text-fg">{REASON_TITLE[reason] ?? 'Гру завершено'}</h2>
        <p className="mt-1 text-fg-subtle">{winnerSubtitle(winner)}</p>

        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" onClick={onNewGame} className="w-full">
            Нова гра
          </Button>
          <Button onClick={onClose} className="w-full">
            Переглянути дошку
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
