import clsx from 'clsx';
import getPieceSymbol from '../../utils/getPieceSymbol';
import { COLORS } from '../../redux/game/gameConstants';

const PROMOTION_CHOICES = [
  { piece: 'Q', label: 'Ферзь' },
  { piece: 'R', label: 'Тура' },
  { piece: 'B', label: 'Слон' },
  { piece: 'N', label: 'Кінь' },
];

const PromotionModal = ({ isOpen, color, onSelect, onCancel }) => {
  if (!isOpen) return null;

  const toFenCase = (letter) => (color === COLORS.WHITE ? letter : letter.toLowerCase());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-ui"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-card border border-border bg-surface p-6 shadow-btn"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-center text-lg font-bold text-fg">Оберіть фігуру</h2>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {PROMOTION_CHOICES.map(({ piece, label }) => (
            <button
              key={piece}
              type="button"
              aria-label={label}
              onClick={() => onSelect(piece)}
              className={clsx(
                'flex flex-col items-center gap-1 rounded-control border border-btn-default-border',
                'bg-btn-default p-3 text-btn-default-fg transition hover:bg-btn-default-hover',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-btn-focus'
              )}
            >
              <span
                className={clsx(
                  'font-glyph text-3xl leading-none',
                  color === COLORS.WHITE
                    ? 'text-piece-white [text-shadow:var(--c-piece-white-shadow)]'
                    : 'text-piece-black [text-shadow:var(--c-piece-black-shadow)]'
                )}
              >
                {getPieceSymbol(toFenCase(piece))}
              </span>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;
