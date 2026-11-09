import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameOverModal from './GameOverModal';

describe('GameOverModal', () => {
  it('нічого не рендерить, коли isOpen=false', () => {
    const { container } = render(
      <GameOverModal isOpen={false} winner="w" reason="checkmate" onNewGame={() => {}} onClose={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('показує "Мат" і переможця білих', () => {
    render(
      <GameOverModal isOpen winner="w" reason="checkmate" onNewGame={() => {}} onClose={() => {}} />
    );

    expect(screen.getByText('Checkmate')).toBeInTheDocument();
    expect(screen.getByText('White wins')).toBeInTheDocument();
  });

  it('показує "Пат" і нічию', () => {
    render(
      <GameOverModal isOpen winner="draw" reason="stalemate" onNewGame={() => {}} onClose={() => {}} />
    );

    expect(screen.getByText('Stalemate')).toBeInTheDocument();
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });

  it('показує "Час вичерпано" і переможця чорних', () => {
    render(
      <GameOverModal isOpen winner="b" reason="timeout" onNewGame={() => {}} onClose={() => {}} />
    );

    expect(screen.getByText('Time out')).toBeInTheDocument();
    expect(screen.getByText('Black wins')).toBeInTheDocument();
  });

  it('кнопка "New game" викликає onNewGame', () => {
    const onNewGame = vi.fn();
    render(
      <GameOverModal isOpen winner="w" reason="checkmate" onNewGame={onNewGame} onClose={() => {}} />
    );

    fireEvent.click(screen.getByText('New game'));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });

  it('кнопка "View board" викликає onClose', () => {
    const onClose = vi.fn();
    render(
      <GameOverModal isOpen winner="w" reason="checkmate" onNewGame={() => {}} onClose={onClose} />
    );

    fireEvent.click(screen.getByText('View board'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
