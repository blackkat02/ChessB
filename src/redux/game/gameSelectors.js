import { createSelector } from '@reduxjs/toolkit';
import { getLegalMoves, getPieceColor } from '../../engine';
import { selectSelectedSquare } from '../ui/uiSelectors';
import { COLORS } from './gameConstants';
import {
  selectCurrentTurn,
  selectPosition,
} from '../position/positionSelectors';

// Селектори запису партії. Позиція (дошка, черга, права рокіровки, en
// passant) — у ../position/positionSelectors.js (docs/layer-separation-step4.md, 4.4).

// === 1. БАЗОВІ СЕЛЕКТОРИ (Raw Data) ===
export const selectWhiteTime = (state) => state.game.whiteTime;
export const selectBlackTime = (state) => state.game.blackTime;
export const selectPlyCount = (state) => state.game.plyCount;
export const selectGameId = (state) => state.game.gameId;
export const selectMoveHistory = (state) => state.game.history;

export const selectMovePairs = createSelector(
  (state) => state.game.history,
  (history) =>
    history.reduce((pairs, move) => {
      if (getPieceColor(move.piece) === COLORS.WHITE) {
        pairs.push({ number: pairs.length + 1, white: move, black: null });
      } else if (pairs.length > 0) {
        // pairs.length === 0 тут означало б, що партія почалась ходом чорних —
        // неможливо у звичайній грі, але захищаємось від "аналізу без правил"
        // (gameOperations.js: isGameOver -> вільні ходи без перевірки черги).
        pairs[pairs.length - 1].black = move;
      }
      return pairs;
    }, [])
);

// === 2. СЕЛЕКТОРИ СТАНУ (Game Status) ===
export const selectIsClockActive = (state, color) =>
  selectCurrentTurn(state) === color;

export const selectClockRemaining = (state, color) => {
  const g = state.game;
  const stored = color === COLORS.WHITE ? g.whiteTime : g.blackTime;
  const isRunning =
    !g.isGameOver &&
    g.plyCount > 0 &&
    g.turnStartedAt !== null &&
    selectCurrentTurn(state) === color;

  if (!isRunning) return stored;
  return Math.max(0, stored - (Date.now() - g.turnStartedAt));
};

export const selectHasGameStarted = (state) => state.game.plyCount > 0;
export const selectIsGameOver = (state) => state.game.isGameOver;
export const selectWinner = (state) => state.game.winner;
export const selectReason = (state) => state.game.reason;

export const selectLegalTargets = createSelector(
  [selectPosition, selectSelectedSquare],
  (position, from) => {
    if (!from) return [];

    return getLegalMoves(position, from);
  }
);
