import { describe, it, expect } from 'vitest';
import { buildTargetMarks } from './buildTargetMarks';

describe('buildTargetMarks', () => {
  it('порожні клітинки — усі move', () => {
    expect(buildTargetMarks(['e3', 'e4'], { e2: 'P' })).toEqual({
      e3: 'move',
      e4: 'move',
    });
  });

  it('клітинка з фігурою — capture', () => {
    expect(buildTargetMarks(['e5', 'd5'], { e4: 'P', d5: 'p' })).toEqual({
      e5: 'move',
      d5: 'capture',
    });
  });

  it("порожній список — порожній об'єкт", () => {
    expect(buildTargetMarks([], {})).toEqual({});
  });

  it('пішак по діагоналі на порожню клітинку (на проході) — capture', () => {
    expect(buildTargetMarks(['e6', 'd6'], { e5: 'P', d5: 'p' }, 'e5')).toEqual({
      e6: 'move',
      d6: 'capture',
    });
  });

  it('кінь на порожню клітинку — move, правило пішака не діє', () => {
    expect(buildTargetMarks(['d6'], { c4: 'N' }, 'c4')).toEqual({
      d6: 'move',
    });
  });
});
