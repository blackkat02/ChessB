/**
 * @param {string | any[]} legalTargets
 * @param {{ e2: string; d5: string; e1: string; e8: string; }} board
 * @param {string} squareId
 */
export function getTargetMark(legalTargets, board, squareId) {
  console.log(board);
  const isLegal = legalTargets.includes(squareId);
  if (!isLegal) return null;

  const isPiece = board[squareId];

  return isPiece ? 'capture' : 'move';
}
