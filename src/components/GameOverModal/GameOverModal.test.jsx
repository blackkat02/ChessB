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

    expect(screen.getByText('Мат')).toBeInTheDocument();
    expect(screen.getByText('Перемога білих')).toBeInTheDocument();
  });

  it('показує "Пат" і нічию', () => {
    render(
      <GameOverModal isOpen winner="draw" reason="stalemate" onNewGame={() => {}} onClose={() => {}} />
    );

    expect(screen.getByText('Пат')).toBeInTheDocument();
    expect(screen.getByText('Нічия')).toBeInTheDocument();
  });

  it('показує "Час вичерпано" і переможця чорних', () => {
    render(
      <GameOverModal isOpen winner="b" reason="timeout" onNewGame={() => {}} onClose={() => {}} />
    );

    expect(screen.getByText('Час вичерпано')).toBeInTheDocument();
    expect(screen.getByText('Перемога чорних')).toBeInTheDocument();
  });

  it('кнопка "Нова гра" викликає onNewGame', () => {
    const onNewGame = vi.fn();
    render(
      <GameOverModal isOpen winner="w" reason="checkmate" onNewGame={onNewGame} onClose={() => {}} />
    );

    fireEvent.click(screen.getByText('Нова гра'));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });

  it('кнопка "Переглянути дошку" викликає onClose', () => {
    const onClose = vi.fn();
    render(
      <GameOverModal isOpen winner="w" reason="checkmate" onNewGame={() => {}} onClose={onClose} />
    );

    fireEvent.click(screen.getByText('Переглянути дошку'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
