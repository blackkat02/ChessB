import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { attemptMove } from '../redux/game/gameOperations';
import { setSelection, resetGame } from '../redux/game/gameSlice';
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

      // state.game.isGameOverдорівнює true, операція має вивести console.warn

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
              timestamp: Date.now(),
            })
          );
        }
      }
    },
    [dispatch, board, selectedSquare]
  );

  const handleTimeUp = useCallback(
    (color) => {
      const state = store.getState(); // Отримуємо актуальний зріз

      // Поки що мат не прописаний, тому просто фіксуємо поразку по часу
      console.log(`⏰ Time's up for ${color === 'w' ? 'White' : 'Black'}`);

      dispatch(
        endGame({
          winner: color === 'w' ? 'b' : 'w',
          reason: 'timeout',
        })
      );
    },
    [dispatch]
  );

  return {
    gameState: { boardPiecesObject: board, selectedSquare, currentTurn },
    handleSquareClick,
    resetGameState: () => dispatch(resetGame()),
  };
};
