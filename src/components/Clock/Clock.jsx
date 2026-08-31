import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

const formatTime = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const Clock = ({ initialTime, color, isActive, onTimeUp, isGameOver }) => {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    setTime(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!isActive || isGameOver || time <= 0) return undefined;

    const interval = setInterval(() => {
      setTime((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(interval);
          onTimeUp?.(color);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isGameOver, time, color, onTimeUp]);

  const totalSeconds = Math.floor(time / 1000);
  const isLowTime = totalSeconds > 0 && totalSeconds < 30;
  const isWhite = color === 'w';

  return (
    <div
      className={clsx(
        'flex w-44 flex-col items-center rounded-xl border px-4 py-3 transition-all duration-300',
        isWhite
          ? 'border-neutral-200 bg-white text-neutral-900'
          : 'border-neutral-900 bg-neutral-800 text-neutral-50',
        isActive &&
          !isGameOver &&
          'scale-105 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.55)]',
        isGameOver && 'opacity-60 grayscale'
      )}
    >
      <span className="text-xs font-medium uppercase tracking-widest opacity-60">
        {isWhite ? 'White' : 'Black'}
      </span>
      <span
        className={clsx(
          'font-mono text-4xl font-bold tabular-nums',
          isLowTime && 'animate-pulse text-red-500'
        )}
      >
        {formatTime(time)}
      </span>
    </div>
  );
};

export default Clock;
