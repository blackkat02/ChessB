import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import * as selectors from '../redux/game/gameSelectors';
import { setSelection, newGameStarted } from '../redux/game/gameSlice';
import { attemptMove } from '../redux/game/gameOperations';
// import { getPieceColor } from '../../utils/chessHelpers';
import { getPieceColor } from '../utils/chessHelpers';
import { COLORS, SIDE_OPTIONS } from '../redux/game/gameConstants';

export const useGameState = () => {
  const dispatch = useDispatch();

  // Витягуємо дані окремими селекторами для оптимізації
  const board = useSelector(selectors.selectBoard);
  const selectedSquare = useSelector(selectors.selectSelectedSquare);
  const turn = useSelector(selectors.selectCurrentTurn);
  const whiteTime = useSelector(selectors.selectWhiteTime);
  const blackTime = useSelector(selectors.selectBlackTime);
  const hasGameStarted = useSelector(selectors.selectHasGameStarted);
  const playerSide = useSelector(selectors.selectPlayerSide);
  const gameId = useSelector(selectors.selectGameId);

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

  const startNewGame = useCallback(
    ({ time, side }) => {
      const resolvedSide =
        side === SIDE_OPTIONS.RANDOM
          ? Math.random() < 0.5
            ? COLORS.WHITE
            : COLORS.BLACK
          : side;

      dispatch(newGameStarted({ time, side: resolvedSide }));
    },
    [dispatch]
  );

  return {
    gameState: {
      boardPiecesObject: board,
      selectedSquare,
      currentTurn: turn,
      whiteTime,
      blackTime,
      hasGameStarted,
      playerSide,
      gameId,
    },
    handleSquareClick,
    startNewGame,
  };
};
