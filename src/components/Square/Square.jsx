import React from 'react';
import Piece from '../Piece/Piece';
import styles from './Square.module.css';

const Square = React.memo(({ id, isLight, showSquareId, pieceType, onClick, isSelected }) => {
  console.log(`Рендер клітинки: ${id}. Вибрана: ${isSelected}. Фігура: ${pieceType}`); 

  const colorName = isLight ? 'світла' : 'темна';
  const pieceDescription = pieceType ? `з фігурою ${pieceType}` : 'порожня';

  return (
    <button // Змінили <div> на <button>
      className={`${styles.square} ${isLight ? styles.light : styles.dark} ${styles[id] || ''}`}
      onClick={() => onClick(id)} 
      // Ці атрибути тепер не потрібні, бо <button> надає їх за замовчуванням
      // role="button"
      // tabIndex={0}
      // onKeyDown={(event) => { /* ... */ }}
      
      // aria-label все ще корисний для надання більш детального контексту
      aria-label={`Клітинка ${id}, ${colorName} ${pieceDescription}`}
    >
      {showSquareId && <span className={styles.squareId}>{id}</span>}
      {pieceType && <Piece type={pieceType} />}
    </button>
  );
});

export default React.memo(Square);