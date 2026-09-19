import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { COLORS, LOW_TIME_THRESHOLD_MS } from '../../redux/game/gameConstants';

const NORMAL_TICK_MS = 250; // достатньо часто для плавного відображення секунд
const FAST_TICK_MS = 100; // нижче LOW_TIME_THRESHOLD_MS — для плавних десятих секунди

const formatTime = (ms) => {
  const clamped = Math.max(0, ms);

  if (clamped < LOW_TIME_THRESHOLD_MS) {
    const totalTenths = Math.floor(clamped / 100);
    const seconds = Math.floor(totalTenths / 10);
    const tenths = totalTenths % 10;
    return `${seconds}.${tenths}`;
  }

  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const Clock = ({ storedMs, turnStartedAt, color, isActive, isGameOver, onTimeUp }) => {
  const [, forceRerender] = useState(0);
  const isRunning = isActive && !isGameOver && turnStartedAt !== null;

  const remainingMs = isRunning
    ? Math.max(0, storedMs - (Date.now() - turnStartedAt))
    : storedMs;

  useEffect(() => {
    if (!isRunning) return undefined;

    let timeoutId;
    let firedTimeUp = false;

    const tick = () => {
      const remaining = Math.max(0, storedMs - (Date.now() - turnStartedAt));
      forceRerender((n) => n + 1);

      if (remaining <= 0) {
        if (!firedTimeUp) {
          firedTimeUp = true;
          onTimeUp?.(color);
        }
        return;
      }

      const delay = remaining < LOW_TIME_THRESHOLD_MS ? FAST_TICK_MS : NORMAL_TICK_MS;
      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, 0);

    const onVisibility = () => forceRerender((n) => n + 1);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isRunning, storedMs, turnStartedAt, color, onTimeUp]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const isLowTime = totalSeconds > 0 && totalSeconds < 30;
  const isWhite = color === COLORS.WHITE;

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
        {formatTime(remainingMs)}
      </span>
    </div>
  );
};

export default Clock;
