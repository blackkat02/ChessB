import { useSelector } from 'react-redux';
import {
  selectBoard,
  selectSelectedSquare,
} from '../../redux/game/gameSelectors';
import { useGameState } from '../../hooks/useGameState';
import { getPieceColor } from '../../utils/chessHelpers';
import ChessBoardView from '../ChessBoardView/ChessBoardView';
import PromotionModal from '../PromotionModal/PromotionModal';

const ChessBoardContainer = ({ showSquareId, flipped }) => {
  const boardPiecesObject = useSelector(selectBoard);
  const selectedSquare = useSelector(selectSelectedSquare);

  const { handleSquareClick, pendingPromotion, resolvePromotion, cancelPromotion } =
    useGameState();

  return (
    <>
      <ChessBoardView
        showSquareId={showSquareId}
        boardPiecesObject={boardPiecesObject}
        selectedSquare={selectedSquare}
        onClick={handleSquareClick}
        flipped={flipped}
      />

      <PromotionModal
        isOpen={Boolean(pendingPromotion)}
        color={pendingPromotion ? getPieceColor(pendingPromotion.piece) : null}
        onSelect={resolvePromotion}
        onCancel={cancelPromotion}
      />
    </>
  );
};

export default ChessBoardContainer;
