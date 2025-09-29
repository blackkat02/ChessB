import React, { useState, useMemo } from 'react'; // Використовуємо useMemo для оптимізації
import Square from '../Square/Square';
import styles from './ChessBoardView.module.css';
import { initialBoardPiecesObject as initialBoardState } from '../../redux/positions';

const ChessBoardView = ({ showSquareId }) => {
    // === Локальний стан дошки ===
    const [boardPiecesObject, setBoardPiecesObject] = useState(initialBoardState);

    // === Локальний стан для виділеної клітинки ===
    const [selectedSquare, setSelectedSquare] = useState(null); 

    // Функція для отримання фігури (НЕ потрібен useCallback, бо вона проста і залежить від стану)
    const getPieceAtSquareId = (squareId) => {
        const piece = boardPiecesObject[squareId];
        return piece ? piece : null;
    };

    // Єдина логіка кліку
    const handleClick = (squareId) => {
        // --- 1. Є ВИБІР: спроба зробити хід ---
        if (selectedSquare !== null) {
            const fromSquare = selectedSquare; 
            const toSquare = squareId;

            // Якщо клікнули на ту саму клітинку - знімаємо виділення
            if (fromSquare === toSquare) {
                setSelectedSquare(null);
                return;
            }

            // Отримуємо фігуру, яку потрібно перемістити
            const pieceToMove = getPieceAtSquareId(fromSquare);

            if (pieceToMove) {
                // ІМУТАБЕЛЬНЕ ОНОВЛЕННЯ СТАНУ ДОШКИ
                const newBoard = { ...boardPiecesObject };
                delete newBoard[fromSquare]; // Видаляємо з початкової клітинки
                newBoard[toSquare] = pieceToMove; // Додаємо на цільову

                setBoardPiecesObject(newBoard);
                console.log(`Хід виконано: ${pieceToMove} з ${fromSquare} на ${toSquare}.`);
            } else {
                 console.warn(`Помилка логіки: на ${fromSquare} не було фігури.`);
            }

            // Завжди скидаємо виділення після спроби ходу
            setSelectedSquare(null); 
        } 
        
        // --- 2. НЕМАЄ ВИБОРУ: вибір фігури ---
        else { 
            const pieceType = getPieceAtSquareId(squareId);

            if (pieceType) { // Якщо фігура є
                setSelectedSquare(squareId); // Виділяємо клітинку
                console.log(`Перший клік: Вибрано фігуру ${pieceType} на ${squareId}.`);
            }
        }
    };

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    // Використовуємо useMemo для створення квадратиків
    // Це запобіжить їхньому зайвому перерахунку, якщо не змінюється стан
    const boardSquares = useMemo(() => {
        const squares = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const isLight = (i + j) % 2 === 0;
                const squareId = `${files[j]}${ranks[i]}`;

                const pieceType = getPieceAtSquareId(squareId); 
                const isSelected = selectedSquare === squareId;

                squares.push(
                    <Square
                        key={squareId}
                        id={squareId}
                        isLight={isLight}
                        showSquareId={showSquareId}
                        pieceType={pieceType}
                        isSelected={isSelected} // Це критично
                        onClick={() => handleClick(squareId)} // Передаємо функцію
                    />
                );
            }
        }
        return squares;
    }, [boardPiecesObject, selectedSquare, showSquareId]); // Залежності: стан дошки та вибір

    return (
        <div className={styles.mainWrapper}>
            <div className={styles.ranksColumn}>
                {ranks.map(rank => (
                    <div key={rank} className={styles.rankLabel}>{rank}</div>
                ))}
            </div>

            <div className={styles.boardWrapper}>
                <div className={styles.chessBoard}>
                    {boardSquares}
                </div>
                <div className={styles.filesRow}>
                    {files.map(file => (
                        <div key={file} className={styles.fileLabel}>{file}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ChessBoardView);