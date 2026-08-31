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
        'font-chess leading-none',
        'text-[clamp(1.75rem,7vw,2.75rem)]',
        isWhite
          ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_0_1px_rgba(0,0,0,0.9)]'
          : 'text-neutral-900 [text-shadow:0_1px_1px_rgba(255,255,255,0.25)]'
      )}
    >
      {symbol}
    </span>
  );
});

export default Piece;
