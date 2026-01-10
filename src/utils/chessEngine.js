import { Chess } from 'chess.js';

/**
 * Валідація через бібліотеку chess.js
 * @param {string} fen - поточний стан дошки в FEN
 * @param {string} from - клітинка звідки (e2)
 * @param {string} to - клітинка куди (e4)
 * @returns {boolean}
 */
export const validateMoveWithChessJS = (fen, from, to) => {
  try {
    const chess = new Chess(fen);
    // Спроба зробити хід у віртуальній пам'яті chess.js
    const move = chess.move({ from, to, promotion: 'q' });

    // Якщо move === null, значить хід нелегальний за правилами шахів
    return move !== null;
  } catch (e) {
    return false;
  }
};
