import React from 'react';
import clsx from 'clsx';
import getPieceSymbol from '../../utils/getPieceSymbol';

const Piece = React.memo(({ type }) => {
  const symbol = getPieceSymbol(type);
  const isWhite = type === type.toUpperCase();

  return (
    <span
      aria-label={`${isWhite ? 'White' : 'Black'} ${type.toUpperCase()}`}
      className={clsx(
        'pointer-events-none absolute inset-0 flex select-none items-center justify-center',
        'font-glyph leading-none text-[length:var(--c-piece-size)]',
        isWhite
          ? 'text-piece-white [text-shadow:var(--c-piece-white-shadow)]'
          : 'text-piece-black [text-shadow:var(--c-piece-black-shadow)]'
      )}
    >
      {symbol}
    </span>
  );
});

export default Piece;
