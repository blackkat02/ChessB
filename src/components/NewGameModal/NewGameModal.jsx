import { useState } from 'react';
import clsx from 'clsx';
import Button from '../Button/Button';
import {
  TIME_CONTROLS,
  SIDE_OPTIONS,
  DEFAULT_TIME,
} from '../../redux/game/gameConstants';

const SIDE_CHOICES = [
  { label: 'White', value: SIDE_OPTIONS.WHITE },
  { label: 'Random', value: SIDE_OPTIONS.RANDOM },
  { label: 'Black', value: SIDE_OPTIONS.BLACK },
];

const optionButtonClass = (isSelected) =>
  clsx(
    'flex-1',
    isSelected ? 'ring-2 ring-btn-focus' : 'opacity-70 hover:opacity-100'
  );

const NewGameModal = ({ isOpen, onClose, onStart, hasGameStarted }) => {
  const [time, setTime] = useState(DEFAULT_TIME);
  const [side, setSide] = useState(SIDE_OPTIONS.WHITE);

  if (!isOpen) return null;

  const handleStart = () => {
    onStart({ time, side });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-ui">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-btn">
        <h2 className="text-lg font-bold text-fg">New game</h2>

        {hasGameStarted && (
          <p className="mt-1 text-sm text-danger">
            The current game will be reset.
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-fg-subtle">
            Time control
          </p>
          <div className="flex flex-wrap gap-2">
            {TIME_CONTROLS.map((control) => (
              <Button
                key={control.value}
                className={optionButtonClass(time === control.value)}
                onClick={() => setTime(control.value)}
              >
                {control.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-fg-subtle">
            Your side
          </p>
          <div className="flex gap-2">
            {SIDE_CHOICES.map((choice) => (
              <Button
                key={choice.value}
                className={optionButtonClass(side === choice.value)}
                onClick={() => setSide(choice.value)}
              >
                {choice.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleStart}>
            Start
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewGameModal;
