import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import * as selectors from '../redux/game/gameSelectors';
import { setSelection, resetGame } from '../redux/game/gameSlice';
import { attemptMove } from '../redux/game/gameOperations';

export const useGameState = () => {
  const dispatch = useDispatch();

  // Витягуємо дані окремими селекторами для оптимізації
  const board = useSelector(selectors.selectBoard);
  const selectedSquare = useSelector(selectors.selectSelectedSquare);
  const turn = useSelector(selectors.selectCurrentTurn);
  const whiteTime = useSelector(selectors.selectWhiteTime);
  const blackTime = useSelector(selectors.selectBlackTime);

  const handleSquareClick = useCallback(
    (squareId) => {
      const piece = board[squareId];

      if (!selectedSquare && piece) {
        // Крок 1: Вибір фігури
        dispatch(setSelection(squareId));
      } else if (selectedSquare) {
        // Крок 2: Спроба ходу
        dispatch(
          attemptMove({
            from: selectedSquare,
            to: squareId,
            piece: board[selectedSquare],
          })
        );
      }
    },
    [dispatch, board, selectedSquare]
  );

  const resetGameState = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  return {
    gameState: {
      boardPiecesObject: board,
      selectedSquare,
      currentTurn: turn,
      whiteTime,
      blackTime,
    },
    handleSquareClick,
    resetGameState,
  };
};
