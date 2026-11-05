import { describe, it, expect, vi, afterEach } from 'vitest';
import { moveExecuted, newGameStarted, endGame } from './gameEvents';
import { COLORS } from './gameConstants';

describe('gameEvents: типи дій', () => {
  // На ці рядки зав'язаний persist (PERSIST_ON у store.js).
  it.each([
    [moveExecuted, 'game/moveExecuted'],
    [newGameStarted, 'game/newGameStarted'],
    [endGame, 'game/endGame'],
  ])('%o має тип %s', (event, type) => {
    expect(event.type).toBe(type);
  });

  it('moveExecuted і newGameStarted передають payload без змін', () => {
    const payload = { time: 180000, side: COLORS.BLACK };

    expect(newGameStarted(payload).payload).toBe(payload);
    expect(moveExecuted(payload).payload).toBe(payload);
  });
});

describe('gameEvents: endGame — timestamp через prepare', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('prepare додає поточну мить, якщо timestamp не передано', () => {
    vi.useFakeTimers();
    vi.setSystemTime(777);

    const action = endGame({ winner: COLORS.WHITE, reason: 'resignation' });

    expect(action.payload).toEqual({
      winner: COLORS.WHITE,
      reason: 'resignation',
      timestamp: 777,
    });
  });

  it('переданий timestamp не перезаписується', () => {
    vi.useFakeTimers();
    vi.setSystemTime(777);

    const action = endGame({
      winner: COLORS.WHITE,
      reason: 'timeout',
      timestamp: 2_000_000,
    });

    expect(action.payload.timestamp).toBe(2_000_000);
  });
});
