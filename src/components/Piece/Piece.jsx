import React from 'react';
import styles from './Piece.module.css';
import getPieceSymbol from '../../utils/getPieceSymbol';

const Piece = React.memo(({ type }) => {
  // 1. Визначення символу
  const symbol = getPieceSymbol(type);

  // 2. ✅ КРИТИЧНО: Визначення кольору за регістром FEN-символу
  // FEN: Велика літера = Біла фігура; Мала літера = Чорна фігура.
  const isWhite = type === type.toUpperCase();
  const colorClass = isWhite ? styles.white : styles.black;

  return (
    <span
      className={`${styles.piece} ${colorClass}`} // ✅ Застосовуємо клас кольору
      // Додаємо aria-label для доступності
      aria-label={`${isWhite ? 'White' : 'Black'} ${type.toUpperCase()}`}
    >
      {symbol}
    </span>
  );
});

export default React.memo(Piece);