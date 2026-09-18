import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const MoveListView = ({ movePairs }) => {
  const lastRowRef = useRef(null);

  useEffect(() => {
    lastRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [movePairs.length]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-card border border-border bg-surface font-ui">
      <h2 className="border-b border-border px-4 py-2 text-sm font-bold text-fg">Ходи</h2>

      <ol className="min-h-0 max-h-64 flex-1 overflow-y-auto px-2 py-1 lg:max-h-none">
        {movePairs.length === 0 && (
          <li className="px-2 py-4 text-center text-sm text-fg-subtle">
            Партія ще не почалась
          </li>
        )}

        {movePairs.map(({ number, white, black }, index) => (
          <li
            key={number}
            ref={index === movePairs.length - 1 ? lastRowRef : null}
            className="flex items-center gap-2 rounded px-2 py-1 text-sm even:bg-square-light/40"
          >
            <span className="w-6 shrink-0 font-semibold text-fg-subtle">{number}.</span>
            <span className="min-w-[3.5rem] flex-1 font-medium text-fg">{white?.san}</span>
            <span className="min-w-[3.5rem] flex-1 font-medium text-fg">{black?.san ?? ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

MoveListView.propTypes = {
  movePairs: PropTypes.arrayOf(
    PropTypes.shape({
      number: PropTypes.number.isRequired,
      white: PropTypes.object,
      black: PropTypes.object,
    })
  ).isRequired,
};

export default React.memo(MoveListView);
