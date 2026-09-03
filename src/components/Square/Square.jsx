import React, { useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Piece from '../Piece/Piece';

const tooltipVariants = {
  initial: { opacity: 0, y: 10, scale: 0.8, x: '-50%' },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    x: '-50%',
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  exit: { opacity: 0, y: -10, scale: 0.8, x: '-50%', transition: { duration: 0.15 } },
};

const Square = React.memo(
  ({ id, isLight, showSquareId, pieceType, onClick, isSelected }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <motion.button
        type="button"
        aria-label={`Клітинка ${id}`}
        onClick={() => onClick(id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ filter: 'brightness(1.08)' }}
        whileTap={{ scale: 0.96 }}
        className={clsx(
          'relative flex aspect-square w-full items-center justify-center border-0 p-0 outline-none',
          isLight ? 'bg-square-light' : 'bg-square-dark',
          isSelected && 'bg-square-selected shadow-[var(--c-square-selected-inset)]'
        )}
      >
        <AnimatePresence>
          {isHovered && (
            <motion.span
              variants={tooltipVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="pointer-events-none absolute -top-7 left-1/2 z-30 rounded bg-square-tooltip px-1.5 py-0.5 text-[10px] font-bold text-square-tooltip-fg"
            >
              {id}
            </motion.span>
          )}
        </AnimatePresence>

        {showSquareId && (
          <span className="pointer-events-none absolute bottom-0.5 left-1 text-[10px] font-semibold text-square-coord">
            {id}
          </span>
        )}

        {pieceType && <Piece type={pieceType} />}
      </motion.button>
    );
  }
);

export default Square;
