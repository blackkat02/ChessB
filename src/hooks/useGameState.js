import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useState } from 'react';
import * as selectors from '../redux/game/gameSelectors';
import {
  selectBoard,
  selectCurrentTurn,
} from '../redux/position/positionSelectors';
import {
  selectSelectedSquare,
  selectPlayerSide,
} from '../redux/ui/uiSelectors';
import { setSelection } from '../redux/ui/uiSlice';
import { newGameStarted } from '../redux/game/gameEvents';
import {
  attemptMove,
  timeExpired,
  resignGame,
  offerDraw,
} from '../redux/game/gameOperations';
import { getPieceColor } from '../engine/chessHelpers';
import { requiresPromotion } from '../engine/promotion';
import { COLORS, SIDE_OPTIONS } from '../redux/game/gameConstants';

export const useGameState = () => {
  const dispatch = useDispatch();

  const board = useSelector(selectBoard);
  const selectedSquare = useSelector(selectSelectedSquare);
  const turn = useSelector(selectCurrentTurn);
  const whiteTime = useSelector(selectors.selectWhiteTime);
  const blackTime = useSelector(selectors.selectBlackTime);
  const turnStartedAt = useSelector((state) => state.game.turnStartedAt);
  const hasGameStarted = useSelector(selectors.selectHasGameStarted);
  const playerSide = useSelector(selectPlayerSide);
  const gameId = useSelector(selectors.selectGameId);
  const isGameOver = useSelector(selectors.selectIsGameOver);
  const winner = useSelector(selectors.selectWinner);
  const reason = useSelector(selectors.selectReason);

  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to, piece } | null

  const handleSquareClick = useCallback(
    (squareId) => {
      if (pendingPromotion) return;

      const piece = board[squareId];
      const isOwnPiece = piece && getPieceColor(piece) === turn;

      if (!selectedSquare) {
        if (isOwnPiece) {
          dispatch(setSelection(squareId));
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

      const move = { from: selectedSquare, to: squareId, piece: movingPiece };

      if (requiresPromotion(movingPiece, squareId)) {
        setPendingPromotion(move);
        return;
      }
      dispatch(attemptMove(move));
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

  const handleTimeUp = useCallback(
    (color) => dispatch(timeExpired(color)),
    [dispatch]
  );

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
      currentTurn: turn,
      whiteTime,
      blackTime,
      turnStartedAt,
      hasGameStarted,
      gameId,
      isGameOver,
      winner,
      reason,
    },
    uiState: {
      selectedSquare,
      playerSide,
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
