// src/data/positions.js (Твій оригінальний файл, але оновлений)

import { fenToBoardObject } from '../utils/fenConverter';
import { STARTING_FEN } from './fenConstants'; // Припустимо, ти створив цей файл

// 1. Витягуємо лише позиційну частину FEN
const positionPart = STARTING_FEN.split(' ')[0];

// 2. Генеруємо об'єкт лише з FEN
export const initialBoardPiecesObject = fenToBoardObject(positionPart);
console.log(initialBoardPiecesObject)



// export const initialBoardPiecesArray = [
//     { name: 'br', position: 'a8' }, { name: 'bn', position: 'b8' }, { name: 'bb', position: 'c8' }, { name: 'bq', position: 'd8' },
//     { name: 'bk', position: 'e8' }, { name: 'bb', position: 'f8' }, { name: 'bn', position: 'g8' }, { name: 'br', position: 'h8' },
//     { name: 'bp', position: 'a7' }, { name: 'bp', position: 'b7' }, { name: 'bp', position: 'c7' }, { name: 'bp', position: 'd7' },
//     { name: 'bp', position: 'e7' }, { name: 'bp', position: 'f7' }, { name: 'bp', position: 'g7' }, { name: 'bp', position: 'h7' },

//     { name: 'wp', position: 'a2' }, { name: 'wp', position: 'b2' }, { name: 'wp', position: 'c2' }, { name: 'wp', position: 'd2' },
//     { name: 'wp', position: 'e2' }, { name: 'wp', position: 'f2' }, { name: 'wp', position: 'g2' }, { name: 'wp', position: 'h2' },
//     { name: 'wr', position: 'a1' }, { name: 'wn', position: 'b1' }, { name: 'wb', position: 'c1' }, { name: 'wq', position: 'd1' },
//     { name: 'wk', position: 'e1' }, { name: 'wb', position: 'f1' }, { name: 'wn', position: 'g1' }, { name: 'wr', position: 'h1' },
// ];

// export const createInitialBoard = () => {
//     const board = Array(8).fill(null).map(() => Array(8).fill(null));

//     initialBoardPieces.forEach(piece => {
//         const { row, col } = algebraicToCoords(piece.position);
//         board[row][col] = piece.name;
//     });

//     return board;
// };

// export const initialBoardPiecesObject = initialBoardPiecesArray.reduce((acc, piece) => {
//     acc[piece.position] = piece.name;
//     return acc;
// }, {});

