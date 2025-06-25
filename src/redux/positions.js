export const initialBoardPieces = [
    { name: 'br', position: 'a8' }, { name: 'bn', position: 'b8' }, { name: 'bb', position: 'c8' }, { name: 'bq', position: 'd8' },
    { name: 'bk', position: 'e8' }, { name: 'bb', position: 'f8' }, { name: 'bn', position: 'g8' }, { name: 'br', position: 'h8' },
    { name: 'bp', position: 'a7' }, { name: 'bp', position: 'b7' }, { name: 'bp', position: 'c7' }, { name: 'bp', position: 'd7' },
    { name: 'bp', position: 'e7' }, { name: 'bp', position: 'f7' }, { name: 'bp', position: 'g7' }, { name: 'bp', position: 'h7' },

    { name: 'wp', position: 'a2' }, { name: 'wp', position: 'b2' }, { name: 'wp', position: 'c2' }, { name: 'wp', position: 'd2' },
    { name: 'wp', position: 'e2' }, { name: 'wp', position: 'f2' }, { name: 'wp', position: 'g2' }, { name: 'wp', position: 'h2' },
    { name: 'wr', position: 'a1' }, { name: 'wn', position: 'b1' }, { name: 'wb', position: 'c1' }, { name: 'wq', position: 'd1' },
    { name: 'wk', position: 'e1' }, { name: 'wb', position: 'f1' }, { name: 'wn', position: 'g1' }, { name: 'wr', position: 'h1' },
];


/**
 * Створює початкову шахову дошку як 8x8 матрицю.
 * @returns {Array<Array<string|null>>} 2D-масив, що представляє дошку.
 */
export const createInitialBoard = () => {
    // Ініціалізуємо порожню дошку нулями або null
    const board = Array(8).fill(null).map(() => Array(8).fill(null));

    // Розставляємо фігури згідно з початковою позицією
    initialBoardPieces.forEach(piece => {
        const { row, col } = algebraicToCoords(piece.position);
        board[row][col] = piece.name;
    });

    return board;
};

