import React, { useMemo } from 'react'; // Видалено useCallback, оскільки він не потрібен
import PropTypes from 'prop-types';
import Square from '../Square/Square';
import styles from './ChessBoardView.module.css';

const ChessBoardView = ({ showSquareId, boardPiecesObject, selectedSquare, onClick }) => {

  // ✅ Приватна функція, не потребує useCallback
  const getPieceAtSquareId = (squareId) => {
    // Логи прибрані, вони викликають перерендер і порушують сенс memo
    return boardPiecesObject[squareId] ?? null;
  };

  const handleSquareClick = onClick; // Псевдонім для чистоти

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // === useMemo для кешування масиву Squares ===
  const boardSquares = useMemo(() => {

    const squares = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const isLight = (i + j) % 2 === 0;
        const squareId = `${files[j]}${ranks[i]}`;

        const pieceType = getPieceAtSquareId(squareId);
        const isSelected = selectedSquare === squareId;

        squares.push(
          <Square
            key={squareId}
            id={squareId}
            isLight={isLight}
            showSquareId={showSquareId}
            pieceType={pieceType}
            isSelected={isSelected}
            onClick={handleSquareClick}
          />
        );
      }
    }
    return squares;
    // ✅ Очищені залежності. handleSquareClick (onClick) стабільний, інші - потрібні.
  }, [boardPiecesObject, selectedSquare, showSquareId, handleSquareClick]);

  return (
    <div className={styles.mainWrapper}>
      <div className={styles.ranksColumn}>
        {ranks.map(rank => (
          <div key={rank} className={styles.rankLabel}>{rank}</div>
        ))}
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.chessBoard}>
          {boardSquares}
        </div>
        <div className={styles.filesRow}>
          {files.map(file => (
            <div key={file} className={styles.fileLabel}>{file}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

ChessBoardView.propTypes = {

  boardPiecesObject: PropTypes.object.isRequired,

  selectedSquare: PropTypes.string,

  onClick: PropTypes.func.isRequired,

  showSquareId: PropTypes.bool.isRequired,
};

export default React.memo(ChessBoardView);
