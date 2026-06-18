import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Piece from '../Piece/Piece';
import styles from './Square.module.css';

const Square = React.memo(
  ({ id, isLight, showSquareId, pieceType, onClick, isSelected }) => {
    const [isHovered, setIsHovered] = useState(false);

    const tooltipVariants = {
      initial: {
        opacity: 0,
        y: 10,
        scale: 0.8,
        x: '-50%',
      },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        x: '-50%',
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 20,
        },
      },
      exit: {
        opacity: 0,
        y: -10,
        scale: 0.8,
        x: '-50%',
        transition: { duration: 0.15 },
      },
    };
    return (
      <motion.button
        className={`${styles.square} 
        ${isLight ? styles.light : styles.dark} 
        ${isSelected ? styles.selectedSquare : ''}
        ${styles[id] || ''}`}
        onClick={() => onClick(id)}
        aria-label={`Клітинка ${id}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ brightness: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Підказка назви поля (Tooltip) */}
        <AnimatePresence>
          {isHovered && (
            <motion.span
              className={styles.tooltip}
              variants={tooltipVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {id}
            </motion.span>
          )}
        </AnimatePresence>

        {showSquareId && <span className={styles.squareId}>{id}</span>}

        {pieceType && <Piece type={pieceType} />}
      </motion.button>
    );
  }
);

export default Square;
