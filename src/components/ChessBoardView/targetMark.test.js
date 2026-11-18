import { describe, it, expect } from 'vitest';
import { buildTargetMarks } from './targetMark';

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
});
