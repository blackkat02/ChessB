import { describe, it, expect } from 'vitest';
import { buildSan } from './notation';
import { makeGameState } from '../test/fixtures';

describe('buildSan', () => {
  it('тихий хід пішака — просто клітинка призначення', () => {
    const move = { from: 'e2', to: 'e4', piece: 'P' };
    expect(buildSan(makeGameState({ e2: 'P' }), move)).toBe('e4');
  });

  it('взяття пішаком — файл-джерело + x + клітинка', () => {
    const move = { from: 'e4', to: 'd5', piece: 'P', captured: 'p' };
    expect(buildSan(makeGameState({ e4: 'P', d5: 'p' }), move)).toBe('exd5');
  });

  it('тихий хід фігури — без дизамбігуації, якщо вона єдина такого типу', () => {
    const move = { from: 'g1', to: 'f3', piece: 'N' };
    expect(buildSan(makeGameState({ g1: 'N' }), move)).toBe('Nf3');
  });

  it('взяття фігурою (не пішаком)', () => {
    const move = { from: 'g1', to: 'f3', piece: 'N', captured: 'p' };
    expect(buildSan(makeGameState({ g1: 'N', f3: 'p' }), move)).toBe('Nxf3');
  });

  it('дизамбігуація по файлу: тури на однаковому ранзі', () => {
    // Обидві тури можуть піти на e1 (порожній 1-й ряд) — різні файли,
    // достатньо вказати файл джерела.
    const move = { from: 'a1', to: 'e1', piece: 'R' };
    expect(buildSan(makeGameState({ a1: 'R', h1: 'R' }), move)).toBe('Rae1');
  });

  it('дизамбігуація по рангу: тури на одному файлі', () => {
    // Обидві тури на файлі 'a' можуть піти на a4 — файли збігаються,
    // потрібен ранг джерела.
    const move = { from: 'a1', to: 'a4', piece: 'R' };
    expect(buildSan(makeGameState({ a1: 'R', a8: 'R' }), move)).toBe('R1a4');
  });

  it('дизамбігуація повним полем: третя фігура ділить і файл, і ранг з різними кандидатами', () => {
    // d4 (хід) ділить файл 'd' з d8, і ранг '4' з f4 — обох candidates
    // недостатньо розрізнити ні файлом, ні рангом окремо.
    const move = { from: 'd4', to: 'd6', piece: 'Q' };
    const board = { d4: 'Q', d8: 'Q', f4: 'Q' };
    expect(buildSan(makeGameState(board), move)).toBe('Qd4d6');
  });

  it('коротка рокіровка', () => {
    const move = { from: 'e1', to: 'g1', piece: 'K', castling: 'K' };
    expect(buildSan(makeGameState({ e1: 'K', h1: 'R' }), move)).toBe('O-O');
  });

  it('довга рокіровка', () => {
    const move = { from: 'e1', to: 'c1', piece: 'K', castling: 'Q' };
    expect(buildSan(makeGameState({ e1: 'K', a1: 'R' }), move)).toBe('O-O-O');
  });

  it('промоція без взяття', () => {
    const move = { from: 'a7', to: 'a8', piece: 'P', promotion: 'Q' };
    expect(buildSan(makeGameState({ a7: 'P' }), move)).toBe('a8=Q');
  });

  it('промоція із взяттям', () => {
    const move = {
      from: 'b7',
      to: 'a8',
      piece: 'P',
      captured: 'n',
      promotion: 'Q',
    };
    expect(buildSan(makeGameState({ b7: 'P', a8: 'n' }), move)).toBe('bxa8=Q');
  });

  it('суфікс шаху (+)', () => {
    const move = { from: 'e2', to: 'e4', piece: 'P' };
    expect(buildSan(makeGameState({ e2: 'P' }), move, { isCheck: true })).toBe(
      'e4+'
    );
  });

  it('суфікс мату (#) переважає над простим шахом', () => {
    const move = { from: 'e2', to: 'e4', piece: 'P' };
    expect(
      buildSan(makeGameState({ e2: 'P' }), move, {
        isCheck: true,
        isCheckmate: true,
      })
    ).toBe('e4#');
  });

  it('без шаху й мату — без суфікса', () => {
    const move = { from: 'e2', to: 'e4', piece: 'P' };
    expect(buildSan(makeGameState({ e2: 'P' }), move)).toBe('e4');
  });
});
