import React, { useMemo, useCallback } from 'react'; 
import PropTypes from 'prop-types';
import Square from '../Square/Square';
import styles from './ChessBoardView.module.css';

const ChessBoardView = ({ showSquareId, boardPiecesObject, selectedSquare, onClick }) => {

    // Функція для отримання фігури (ТЕПЕР ЗАЛЕЖИТЬ ВІД ПРОПСА boardPiecesObject)
    const getPieceAtSquareId = useCallback((squareId) => {
        console.log(boardPiecesObject[squareId])
        return boardPiecesObject[squareId] ?? null; 
    }, [boardPiecesObject]); 

    const handleSquareClick = onClick; 

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    // === useMemo для кешування масиву Squares ===
    const boardSquares = useMemo(() => {
        // Ми не виводимо console.log, якщо використовуємо React.memo!
        const squares = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const isLight = (i + j) % 2 === 0;
                const squareId = `${files[j]}${ranks[i]}`;

                const pieceType = getPieceAtSquareId(squareId); 
                // isSelected та showSquareId — тепер пропси або похідні дані
                const isSelected = selectedSquare === squareId; 

                squares.push(
                    <Square
                        key={squareId}
                        id={squareId}
                        isLight={isLight}
                        showSquareId={showSquareId}
                        pieceType={pieceType}
                        isSelected={isSelected} 
                        // ПЕРЕДАЄМО КОЛБЕК, ОТРИМАНИЙ ВІД БАТЬКІВСЬКОГО КОМПОНЕНТА
                        onClick={handleSquareClick} 
                    />
                );
            }
        }
        return squares;
    // ЗАЛЕЖНОСТІ: Спрацює лише, коли зміниться дошка, виділена клітинка, або showSquareId.
    }, [boardPiecesObject, selectedSquare, showSquareId, getPieceAtSquareId, handleSquareClick]); 
    // getPieceAtSquareId тепер у залежностях, оскільки він обгорнутий у useCallback

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

// === НОВИЙ КОД: ВАЛІДАЦІЯ ПРОПСІВ ===
ChessBoardView.propTypes = {
    // boardPiecesObject тепер обов'язковий і має бути об'єктом
    boardPiecesObject: PropTypes.object.isRequired, 
    
    // selectedSquare може бути рядком або null
    selectedSquare: PropTypes.string, 
    
    // onClick — це функція (наш handleSquareClick)
    onClick: PropTypes.func.isRequired,
    
    // showSquareId — вже був у пропсах
    showSquareId: PropTypes.bool.isRequired,
};

export default React.memo(ChessBoardView);
