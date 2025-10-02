// features/chess/chessSelectors.js
import { createSelector } from '@reduxjs/toolkit';
import { boardToFen } from '../../utils/fenUtils'; // Імпортуємо функцію

const getBoard = (state) => state.chess.board;
const getCurrentPlayer = (state) => state.chess.currentPlayer;
const getCastleFlags = (state) => ({
    canWhiteCastleKingSide: state.chess.canWhiteCastleKingSide,
    canWhiteCastleQueenSide: state.chess.canWhiteCastleQueenSide,
    canBlackCastleKingSide: state.chess.canBlackCastleKingSide,
    canBlackCastleQueenSide: state.chess.canBlackCastleQueenSide,
});
const getLastMoveEnPassantTarget = (state) => state.chess.lastMoveEnPassantTarget;
const getHalfMoveClock = (state) => state.chess.halfMoveClock;
const getFullMoveNumber = (state) => state.chess.fullMoveNumber;


export const selectFen = createSelector(
    [getBoard, getCurrentPlayer, getCastleFlags, getLastMoveEnPassantTarget, getHalfMoveClock, getFullMoveNumber],
    (board, currentPlayer, castleFlags, enPassantTarget, halfMoveClock, fullMoveNumber) => {
        return boardToFen(board, currentPlayer, castleFlags, enPassantTarget, halfMoveClock, fullMoveNumber);
    }
);