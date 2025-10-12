// src/utils/getPieceSymbol.js (Виправлено під FEN-стандарт)

const getPieceSymbol = (fenSymbol) => {
  const symbols = {
    // Білі фігури (FEN: Велика літера)
    'P': '♙', // Pawn (U+2659)
    'N': '♘', // Knight (U+2658)
    'B': '♗', // Bishop (U+2657)
    'R': '♖', // Rook (U+2656)
    'Q': '♕', // Queen (U+2655)
    'K': '♔', // King (U+2654)

    // Чорні фігури (FEN: Мала літера)
    'p': '♟', // Pawn (U+265F)
    'n': '♞', // Knight (U+265E)
    'b': '♝', // Bishop (U+265D)
    'r': '♜', // Rook (U+265C) 
    'q': '♛', // Queen (U+265B)
    'k': '♚'  // King (U+265A)
  };

  // Тепер ти передаєш просто 'P' або 'r'
  return symbols[fenSymbol] || '';
};

export default getPieceSymbol;
