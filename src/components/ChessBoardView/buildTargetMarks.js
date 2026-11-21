import { getPieceType } from '../../engine';

/**
 * Позначки легальних ходів: ключ — клітинка, значення — 'move' або 'capture'.
 * Пішак ходить по діагоналі лише коли б'є, тому діагональ пішака — 'capture',
 * навіть на порожню клітинку (взяття на проході).
 *
 * @param {string[]} legalTargets
 * @param {Record<string, string>} board
 * @param {string | null} [from] - вибрана клітинка
 */
export function buildTargetMarks(legalTargets, board, from = null) {
  /** @type {Record<string, 'move' | 'capture'>} */
  const marks = {};
  const isPawn = from ? getPieceType(board[from]) === 'P' : false;
  const fromFile = from?.[0];

  for (const square of legalTargets) {
    const isPawnDiagonal = isPawn && square[0] !== fromFile;

    if (board[square] || isPawnDiagonal) {
      marks[square] = 'capture';
    } else {
      marks[square] = 'move';
    }
  }

  return marks;
}
