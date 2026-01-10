import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { attemptMove } from '../redux/game/gameOperations';
import { setSelection, resetGame } from '../redux/game/gameSlice';
// import {
//   selectBoard,
//   selectSelectedSquare,
//   selectTurn,
// } from '../redux/game/gameSelectors';
import * as selectors from '../redux/game/gameSelectors';

export const useGameState = () => {
  const dispatch = useDispatch();

  // Витягуємо дані через селектори
  const board = useSelector(selectors.selectBoard);
  const selectedSquare = useSelector(selectors.selectSelectedSquare);
  const currentTurn = useSelector(selectors.selectTurn);

  const handleSquareClick = useCallback(
    (squareId) => {
      const piece = board[squareId];

      // 1. Вибір фігури (Клік 1)
      if (selectedSquare === null && piece) {
        // Тут можна додати заглушку-перевірку черги (currentTurn)
        dispatch(setSelection(squareId));
      }
      // 2. Спроба ходу (Клік 2)
      else if (selectedSquare !== null) {
        if (selectedSquare === squareId) {
          dispatch(setSelection(null));
        } else {
          dispatch(
            attemptMove({
              from: selectedSquare,
              to: squareId,
              piece: board[selectedSquare],
            })
          );
        }
      }
    },
    [dispatch, board, selectedSquare]
  );

  return {
    gameState: { boardPiecesObject: board, selectedSquare, currentTurn },
    handleSquareClick,
    resetGameState: () => dispatch(resetGame()),
  };
};
