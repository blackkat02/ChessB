import React, { useState, useMemo, useCallback } from 'react'; // Усе імпортовано коректно
import Square from '../Square/Square';
import styles from './ChessBoardView.module.css';
import { initialBoardPiecesObject as initialBoardState } from '../../redux/positions';

const ChessBoardView = ({ showSquareId }) => {
    // === Стан дошки та виділення ===
    const [boardPiecesObject, setBoardPiecesObject] = useState(initialBoardState);
    const [selectedSquare, setSelectedSquare] = useState(null); 

    // Функція для отримання фігури
    // Її не потрібно обгортати в useCallback, але вона залежить від boardPiecesObject
    const getPieceAtSquareId = (squareId) => {
        const piece = boardPiecesObject[squareId];
        return piece ? piece : null;
    };

    // === КЛЮЧОВИЙ МОМЕНТ: handleClick зі стабільними залежностями ===
    const handleClick = useCallback((squareId) => {
        // --- 1. Є ВИБІР: спроба зробити хід ---
        if (selectedSquare !== null) {
            const fromSquare = selectedSquare; 
            const toSquare = squareId;

            // Якщо клікнули на ту саму клітинку - знімаємо виділення
            if (fromSquare === toSquare) {
                setSelectedSquare(null);
                return;
            }

            // === ВИКОРИСТАННЯ ФУНКЦІОНАЛЬНОГО ОНОВЛЕННЯ ДЛЯ setBoardPiecesObject ===
            // Це мінімізує залежності, оскільки setBoardPiecesObject тепер не залежить від boardPiecesObject
            setBoardPiecesObject(prevBoard => {
                const pieceToMove = prevBoard[fromSquare];

                if (!pieceToMove) {
                    console.warn(`Помилка логіки: на ${fromSquare} не було фігури.`);
                    return prevBoard;
                }

                const newBoard = { ...prevBoard };
                delete newBoard[fromSquare];
                newBoard[toSquare] = pieceToMove;

                console.log(`Хід виконано: ${pieceToMove} з ${fromSquare} на ${toSquare}.`);
                return newBoard;
            });

            // Завжди скидаємо виділення після спроби ходу
            setSelectedSquare(null); 
        } 
        
        // --- 2. НЕМАЄ ВИБОРУ: вибір фігури ---
        else { 
            // Тут ми використовуємо поточний стан boardPiecesObject через getPieceAtSquareId
            const pieceType = getPieceAtSquareId(squareId);

            if (pieceType) {
                setSelectedSquare(squareId);
                console.log(`Перший клік: Вибрано фігуру ${pieceType} на ${squareId}.`);
            }
        }
    // ЗАЛЕЖНОСТІ: Функція оновлюється лише при зміні selectedSquare або getPieceAtSquareId.
    // Оскільки getPieceAtSquareId залежить від boardPiecesObject, це призведе до оновлення.
    }, [selectedSquare, getPieceAtSquareId]); 

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    // === useMemo для кешування масиву Squares ===
    const boardSquares = useMemo(() => {
        console.log('--- ПЕРЕРАХУНОК boardSquares (завдяки useMemo) ---');
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
                        isSelected={isSelected} 
                        // ПЕРЕДАЄМО СТАБІЛЬНИЙ КОЛБЕК
                        onClick={handleClick} 
                    />
                );
            }
        }
        return squares;
    // ЗАЛЕЖНОСТІ: useMemo спрацює, лише коли зміниться одне з цих значень
    }, [boardPiecesObject, selectedSquare, showSquareId, getPieceAtSquareId, handleClick]); 

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