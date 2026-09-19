import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useState } from 'react';
import * as selectors from '../redux/game/gameSelectors';
import { setSelection, newGameStarted } from '../redux/game/gameSlice';
import { attemptMove, timeExpired, resignGame, offerDraw } from '../redux/game/gameOperations';
// import { getPieceColor } from '../../utils/chessHelpers';
import { getPieceColor } from '../utils/chessHelpers';
import { requiresPromotion } from '../engine/promotion';
import { COLORS, SIDE_OPTIONS } from '../redux/game/gameConstants';

export const useGameState = () => {
  const dispatch = useDispatch();

  const board = useSelector(selectors.selectBoard);
  const selectedSquare = useSelector(selectors.selectSelectedSquare);
  const turn = useSelector(selectors.selectCurrentTurn);
  const whiteTime = useSelector(selectors.selectWhiteTime);
  const blackTime = useSelector(selectors.selectBlackTime);
  const turnStartedAt = useSelector((state) => state.game.turnStartedAt);
  const hasGameStarted = useSelector(selectors.selectHasGameStarted);
  const playerSide = useSelector(selectors.selectPlayerSide);
  const gameId = useSelector(selectors.selectGameId);
  const isGameOver = useSelector(selectors.selectIsGameOver);
  const winner = useSelector(selectors.selectWinner);
  const reason = useSelector(selectors.selectReason);

  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to, piece } | null

  const handleSquareClick = useCallback(
    (squareId) => {
      if (pendingPromotion) return; // дошка заблокована, поки відкрита модалка вибору фігури

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

      const movingPiece = board[selectedSquare];

      if (requiresPromotion(movingPiece, squareId)) {
        setPendingPromotion({ from: selectedSquare, to: squareId, piece: movingPiece });
        return;
      }

      // Якщо вже щось вибрано — намагаємося ходити
      dispatch(
        attemptMove({
          from: selectedSquare,
          to: squareId,
          piece: movingPiece,
        })
      );
    },
    [dispatch, board, selectedSquare, turn, pendingPromotion]
  );

  const resolvePromotion = useCallback(
    (promotion) => {
      if (!pendingPromotion) return;
      dispatch(attemptMove({ ...pendingPromotion, promotion }));
      setPendingPromotion(null);
    },
    [dispatch, pendingPromotion]
  );

  const cancelPromotion = useCallback(() => setPendingPromotion(null), []);

  const handleTimeUp = useCallback((color) => dispatch(timeExpired(color)), [dispatch]);

  const handleResign = useCallback(() => dispatch(resignGame()), [dispatch]);
  const handleOfferDraw = useCallback(() => dispatch(offerDraw()), [dispatch]);

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
      turnStartedAt,
      hasGameStarted,
      playerSide,
      gameId,
      isGameOver,
      winner,
      reason,
    },
    handleSquareClick,
    startNewGame,
    pendingPromotion,
    resolvePromotion,
    cancelPromotion,
    handleTimeUp,
    handleResign,
    handleOfferDraw,
  };
};
