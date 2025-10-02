// actions.js-псевдокод
import { algebraicToCoords } from './utils/board';
import { isValidMoveLogic, isKingInCheck, findLegalMovesForPlayer } from './utils/chessRules'; // Ваша логіка шахових правил

export const makeChessMove = (fromAlgebraic, toAlgebraic) => {
    return (dispatch, getState) => {
        const state = getState();
        const currentBoard = state.chess.board;
        const currentPlayer = state.chess.currentPlayer; // 'white' або 'black'
        const history = state.chess.history; // Може знадобитися для рокіровки/ен-пассану

        const { col: fromCol, row: fromRow } = algebraicToCoords(fromAlgebraic);
        const { col: toCol, row: toRow } = algebraicToCoords(toAlgebraic);

        const piece = currentBoard[fromRow][fromCol];

        // 1. Початкові перевірки (чи є фігура, чи належить гравцеві)
        if (!piece || piece[0] !== currentPlayer[0]) {
            console.error("Недійсний хід: Не ваша фігура або порожня клітинка.");
            return;
        }

        // 2. Основна логіка валідації ходу для фігури
        // Ця функція поверне `true` / `false` і, можливо, додаткові дані про хід (чи це взяття, рокіровка тощо)
        // Вона також повинна перевіряти, чи не "проходять" фігури через інші фігури, якщо це заборонено.
        const validationResult = isValidMoveLogic(currentBoard, fromCol, fromRow, toCol, toRow, piece, currentPlayer, history);

        if (!validationResult.isValid) {
            console.error("Недійсний хід: Не відповідає правилам руху фігури або є перешкоди.", validationResult.reason);
            return;
        }

        // 3. Тимчасове виконання ходу для перевірки шаху
        const tempBoard = currentBoard.map(row => [...row]); // Глибока копія дошки
        // Виконуємо хід на `tempBoard`
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = null;
        // ... також обробляємо взяття, рокіровку, ен-пассан на tempBoard

        // 4. Перевірка, чи не поставив хід власного короля під шах
        if (isKingInCheck(tempBoard, currentPlayer)) {
            console.error("Недійсний хід: Цей хід ставить вашого короля під шах.");
            return;
        }

        // 5. Перевірка на шах / мат / пат для опонента після ходу
        const opponentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        const opponentInCheck = isKingInCheck(tempBoard, opponentPlayer);
        let checkmate = false;
        let stalemate = false;

        if (opponentInCheck) {
            const opponentLegalMoves = findLegalMovesForPlayer(tempBoard, opponentPlayer);
            if (opponentLegalMoves.length === 0) {
                checkmate = true;
            }
        } else {
            const opponentLegalMoves = findLegalMovesForPlayer(tempBoard, opponentPlayer);
            if (opponentLegalMoves.length === 0) {
                stalemate = true;
            }
        }

        // 6. Формуємо `movePayload` з усіма зібраними даними
        const movePayload = {
            from: fromAlgebraic,
            to: toAlgebraic,
            piece: piece,
            type: validationResult.type, // 'normal', 'capture', 'castle' тощо
            capturedPiece: validationResult.capturedPiece,
            promotionTo: validationResult.promotionTo,
            castleInfo: validationResult.castleInfo,
            enPassantTarget: validationResult.enPassantTarget,
            check: opponentInCheck,
            checkmate: checkmate,
            stalemate: stalemate,
            // Можливо, інша метаінформація:
            // prevBoardState: currentBoard, // Для функції "скасувати хід"
        };

        // 7. Диспатчимо валідний екшн до редьюсера
        dispatch({
            type: 'MAKE_CHESS_MOVE',
            payload: movePayload,
        });
    };
};