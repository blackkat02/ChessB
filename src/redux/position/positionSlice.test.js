import { describe, it, expect } from 'vitest';
import positionReducer from './positionSlice';
import { moveExecuted, newGameStarted } from '../game/gameEvents';
import { COLORS } from '../game/gameConstants';
import { initialBoardPiecesObject } from '../../data/positions';
import { ALL_CASTLING, makeMovePayload } from '../../test/fixtures';
import { makePositionState } from '../../test/fixtures/store';

// Слайс позиції не має власних команд: його змінюють лише події з
// gameEvents.js (docs/layer-separation-step4.md, 4.4). Позицію рахує
// applyMove у attemptMove, тож payload.position тут збирається вручну —
// за тим самим контрактом, що й у applyMove (з turn).

const blackE5 = (overrides = {}) =>
  makeMovePayload({
    move: { from: 'e7', to: 'e5', piece: 'p' },
    color: COLORS.BLACK,
    position: {
      board: { e5: 'p' },
      castlingRights: { ...ALL_CASTLING },
      enPassantTarget: 'e6',
      turn: COLORS.WHITE,
    },
    san: 'e5',
    ...overrides,
  });

const INIT = { type: '@@INIT' };

describe('positionSlice: початковий стан', () => {
  it('стандартна розстановка, повні права рокіровки, без en passant', () => {
    expect(positionReducer(undefined, INIT)).toEqual({
      board: initialBoardPiecesObject,
      castlingRights: { ...ALL_CASTLING },
      enPassantTarget: null,
      turn: COLORS.WHITE,
    });
  });

  it('на старті партії хід білих', () => {
    expect(positionReducer(undefined, INIT).turn).toBe('w');
  });
});

describe('positionSlice: moveExecuted', () => {
  it('бере board, castlingRights, enPassantTarget і turn з payload.position', () => {
    const state = makePositionState({ board: { e2: 'P' } });
    const payload = makeMovePayload({
      position: {
        board: { e4: 'P' },
        castlingRights: { ...ALL_CASTLING, whiteShort: false },
        enPassantTarget: 'e3',
        turn: 'b',
      },
    });

    const next = positionReducer(state, moveExecuted(payload));

    expect(next).toEqual({
      board: { e4: 'P' },
      castlingRights: { ...ALL_CASTLING, whiteShort: false },
      enPassantTarget: 'e3',
      turn: 'b',
    });
  });

  it('після ходу чорних черга переходить до білих', () => {
    const state = makePositionState({ board: { e7: 'p' }, turn: 'b' });

    const next = positionReducer(state, moveExecuted(blackE5()));

    expect(next.turn).toBe('w');
    expect(next.board).toEqual({ e5: 'p' });
  });
});

describe('positionSlice: newGameStarted', () => {
  // Раніше позицію скидав gameSlice через ...initialState. Після розбиття це
  // робить лише цей слайс — без цього тесту нова партія тихо стартувала б
  // зі старою дошкою і чергою.
  it('після ходу повертає стандартну розстановку і хід білих', () => {
    const afterMove = positionReducer(
      positionReducer(undefined, INIT),
      moveExecuted(makeMovePayload())
    );
    expect(afterMove.turn).toBe('b');

    const next = positionReducer(
      afterMove,
      newGameStarted({ time: 180000, side: COLORS.BLACK })
    );

    expect(next).toEqual(positionReducer(undefined, INIT));
  });
});
