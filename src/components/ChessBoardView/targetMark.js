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
