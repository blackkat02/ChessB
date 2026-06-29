import React from 'react';
import styles from './Piece.module.css';
import getPieceSymbol from '../../utils/getPieceSymbol';

const Piece = React.memo(({ type }) => {
  const symbol = getPieceSymbol(type);

  const isWhite = type === type.toUpperCase();
  const colorClass = isWhite ? styles.white : styles.black;

  return (
    <span
      className={`${styles.piece} ${colorClass}`} // ✅ Застосовуємо клас кольору
      aria-label={`${isWhite ? 'White' : 'Black'} ${type.toUpperCase()}`}
    >
      {symbol}
    </span>
  );
});

export default React.memo(Piece);
