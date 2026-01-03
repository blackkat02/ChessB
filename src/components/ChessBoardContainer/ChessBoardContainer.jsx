import React from 'react';
import { useSelector } from 'react-redux';
import ChessBoardView from '../ChessBoardView/ChessBoardView';
import { useGameState } from '../../hooks/useGameState';
import {
  selectBoardPiecesObject,
  selectSelectedSquare,
} from '../../redux/game/gameSelectors';

const ChessBoardContainer = ({ showSquareId }) => {
  const boardPiecesObject = useSelector(selectBoardPiecesObject);
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
