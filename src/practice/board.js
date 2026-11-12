// Практика, рівень 1: об'єкти. Умови задач — у ./README.md.
//
// Дошка — звичайний об'єкт: ключ — клітинка, значення — фігура.
//   { e1: 'K', e2: 'P', e8: 'k' }
// Велика літера — біла фігура, мала — чорна. Порожніх клітинок у об'єкті
// немає взагалі (не null, не '' — ключа просто нема).
// Кольори: 'w' — білі, 'b' — чорні.
//
// Рушій (src/engine) тут НЕ імпортуй — пиши все сам.

// Задача 1
export function countPieces(board) {
  return Object.keys(board).length;
}

// Задача 2
export function findKing(board, color) {
  let kingColor = 'K';

  if (color === 'b') {
    kingColor = 'k';
  }

  for (const piece in board) {
    if (board[piece] === kingColor) return piece;
  }

  return null;
}

// Задача 3
export function piecesOf(board, color) {
  const res = [];
  for (const piece in board) {
    if (color === 'w') {
      if (board[piece] === board[piece].toUpperCase()) {
        res.push(piece);
      }
    } else {
      if (board[piece] === board[piece].toLowerCase()) {
        res.push(piece);
      }
    }
  }

  return res;
}

// Задача 4
export function movePiece(board, from, to) {
  const copy = { ...board };

  if (copy[from] && to !== from) {
    copy[to] = copy[from];
    delete copy[from];
  }

  return copy;
}
