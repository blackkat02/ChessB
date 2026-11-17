import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChessBoardView from './ChessBoardView';

describe('ChessBoardView — позначки ходів', () => {
  it('дві порожні легальні клітинки — дві точки, жодного кільця', () => {
    render(
      <ChessBoardView
        boardPiecesObject={{ e2: 'P' }}
        selectedSquare="e2"
        legalTargets={['e3', 'e4']}
        onClick={vi.fn()}
      />
    );

    expect(screen.queryAllByTestId('move-target')).toHaveLength(2);
    expect(screen.queryAllByTestId('capture-target')).toHaveLength(0);
  });

  it('легальна клітинка з фігурою — одне кільце', () => {
    render(
      <ChessBoardView
        boardPiecesObject={{ e4: 'P', d5: 'p' }}
        selectedSquare="e2"
        legalTargets={['e5', 'd5']}
        onClick={vi.fn()}
      />
    );

    // e5 порожня → точка; d5 з чорним пішаком → кільце
    expect(screen.queryAllByTestId('move-target')).toHaveLength(1);
    expect(screen.queryAllByTestId('capture-target')).toHaveLength(1);
  });

  it('нічого не вибрано — жодної позначки', () => {
    // legalTargets: []
    render(
      <ChessBoardView
        boardPiecesObject={{ e2: 'P' }}
        selectedSquare="e2"
        legalTargets={[]}
        onClick={vi.fn()}
      />
    );

    expect(screen.queryAllByTestId('move-target')).toHaveLength(0);
    expect(screen.queryAllByTestId('capture-target')).toHaveLength(0);
  });
});
