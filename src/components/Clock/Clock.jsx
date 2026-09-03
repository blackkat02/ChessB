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
        'flex w-[var(--c-clock-width)] flex-col items-center rounded-card border px-4 py-3 font-ui transition-all duration-300',
        isWhite
          ? 'bg-clock-white-bg text-clock-white-fg border-clock-white-border'
          : 'bg-clock-black-bg text-clock-black-fg border-clock-black-border',
        isActive && !isGameOver && 'scale-105 border-clock-active-border shadow-clock-active',
        isGameOver && 'opacity-60 grayscale'
      )}
    >
      <span className="text-xs font-medium uppercase tracking-widest opacity-60">
        {isWhite ? 'White' : 'Black'}
      </span>
      <span
        className={clsx(
          'font-numeric text-4xl font-bold tabular-nums',
          isLowTime && 'animate-pulse text-clock-danger'
        )}
      >
        {formatTime(time)}
      </span>
    </div>
  );
};

export default Clock;
