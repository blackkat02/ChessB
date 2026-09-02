import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import Square from '../Square/Square';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const ChessBoardView = ({
  showSquareId,
  boardPiecesObject,
  selectedSquare,
  onClick,
}) => {
  const getPieceAtSquareId = useCallback(
    (squareId) => boardPiecesObject[squareId] ?? null,
    [boardPiecesObject]
  );

  const boardSquares = useMemo(() => {
    const squares = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const isLight = (i + j) % 2 === 0;
        const squareId = `${FILES[j]}${RANKS[i]}`;
        squares.push(
          <Square
            key={squareId}
            id={squareId}
            isLight={isLight}
            showSquareId={showSquareId}
            pieceType={getPieceAtSquareId(squareId)}
            isSelected={selectedSquare === squareId}
            onClick={onClick}
          />
        );
      }
    }
    return squares;
  }, [showSquareId, selectedSquare, getPieceAtSquareId, onClick]);

  return (
    <div className="inline-block select-none font-ui">
      <div className="flex gap-1.5">
        <div className="flex w-4 flex-col justify-around py-2 text-center text-xs font-bold text-board-coord">
          {RANKS.map((rank) => (
            <span key={rank}>{rank}</span>
          ))}
        </div>

        <div className="w-[var(--c-board-max-width)] max-w-[82vw] rounded-frame bg-board-frame p-2 shadow-board">
          <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-md ring-1 ring-board-edge">
            {boardSquares}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex gap-1.5">
        <div className="w-4" />
        <div className="grid w-[var(--c-board-max-width)] max-w-[82vw] grid-cols-8 px-2 text-center text-xs font-bold text-board-coord">
          {FILES.map((file) => (
            <span key={file}>{file}</span>
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
  showSquareId: PropTypes.bool,
};

export default React.memo(ChessBoardView);
