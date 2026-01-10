import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import * as selectors from '../redux/game/gameSelectors';
import { setSelection, resetGame } from '../redux/game/gameSlice';
import { attemptMove } from '../redux/game/gameOperations';
// import { getPieceColor } from '../../utils/chessHelpers';
import { getPieceColor } from '../utils/chessHelpers';

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
      console.log('--- [CLICK START] ---', squareId);
      const piece = board[squareId];
      console.log(
        '--- [piece = board[squareId]] ---',
        piece,
        squareId,
        turn,
        selectedSquare
      );

      if (!selectedSquare) {
        if (piece && getPieceColor(piece) === turn) {
          dispatch(setSelection(squareId));
        } else if (piece && getPieceColor(piece) !== turn) {
          console.log('--- [[хід чужим кольором]] ---');
        }
        return;
      }

      if (selectedSquare === squareId) {
        // 1. Клікнули на ту саму фігуру — знімаємо виділення
        dispatch(setSelection(null));
        return;
      }

      const pieceColor = piece ? getPieceColor(piece) : null;
      if (piece && pieceColor === turn) {
        // 2. Клікнули на іншу СВОЮ фігуру — перевибираємо її
        dispatch(setSelection(squareId));
        return;
      }

      // Якщо вже щось вибрано — намагаємося ходити
      dispatch(
        attemptMove({
          from: selectedSquare,
          to: squareId,
          piece: board[selectedSquare],
        })
      );
    },
    [dispatch, board, selectedSquare, turn]
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
