/**
 * @param {string[]} legalTargets
 * @param {{ e2: string; d5: string; e1: string; e8: string; }} board
 * @param {string} squareId
 */
export function getTargetMark(legalTargets, board, squareId) {
  const isLegal = legalTargets.includes(squareId);
  if (!isLegal) return null;

  const piece = board[squareId];

  return piece ? 'capture' : 'move';
}

/**
 * @param {string[]} legalTargets
 * @param {object} board
 */
export function buildTargetMarks(legalTargets, board) {
  return legalTargets.reduce((acc, square) => {
    if (board[square]) {
      acc[square] = 'capture';
    } else {
      acc[square] = 'move';
    }
    return acc;
  }, {});
}
