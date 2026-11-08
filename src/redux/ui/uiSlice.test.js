import { describe, it, expect } from 'vitest';
import uiReducer, { setSelection } from './uiSlice';
import { moveExecuted, newGameStarted } from '../game/gameEvents';
import { makeMovePayload } from '../../test/fixtures';

const init = () => uiReducer(undefined, { type: '@@INIT' });

describe('uiSlice', () => {
  it('початковий стан: без виділення, білі', () => {
    expect(init()).toEqual({ selectedSquare: null, playerSide: 'w' });
  });

  it('setSelection записує клітинку', () => {
    expect(uiReducer(init(), setSelection('e2')).selectedSquare).toBe('e2');
  });

  it('moveExecuted знімає виділення', () => {
    const state = { ...init(), selectedSquare: 'e2' };

    const next = uiReducer(state, moveExecuted(makeMovePayload()));

    expect(next.selectedSquare).toBeNull();
  });

  it('newGameStarted знімає виділення й бере сторону з payload', () => {
    const state = { selectedSquare: 'e2', playerSide: 'w' };

    const next = uiReducer(state, newGameStarted({ time: 180000, side: 'b' }));

    expect(next).toEqual({ selectedSquare: null, playerSide: 'b' });
  });
});
