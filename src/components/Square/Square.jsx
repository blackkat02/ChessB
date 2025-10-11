import React from 'react';
import Piece from '../Piece/Piece';
import styles from './Square.module.css';

const Square = React.memo(({ id, isLight, showSquareId, pieceType, onClick, isSelected }) => {
  return (
    <button
      className={`${styles.square} 
        ${isLight ? styles.light : styles.dark} 
        ${isSelected ? styles.selectedSquare : ''}
        ${styles[id] || ''}`}
      onClick={() => onClick(id)}
      aria-label={`Клітинка ${id}`}
    >
      {showSquareId && <span className={styles.squareId}>{id}</span>}
      {pieceType && <Piece type={pieceType} />}
    </button>
  );
});

export default React.memo(Square);