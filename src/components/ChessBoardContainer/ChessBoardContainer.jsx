import { useSelector } from 'react-redux';
import {
  selectBoard,
  selectSelectedSquare,
} from '../../redux/game/gameSelectors';
import { useGameState } from '../../hooks/useGameState';
import ChessBoardView from '../ChessBoardView/ChessBoardView';

const ChessBoardContainer = ({ showSquareId }) => {
  const boardPiecesObject = useSelector(selectBoard);
  const selectedSquare = useSelector(selectSelectedSquare);

  const { handleSquareClick } = useGameState();

  return (
    <ChessBoardView
      showSquareId={showSquareId}
      boardPiecesObject={boardPiecesObject}
      selectedSquare={selectedSquare}
      onClick={handleSquareClick}
    />
  );
};

export default ChessBoardContainer;
