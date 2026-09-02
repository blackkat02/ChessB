import React, { useState, useEffect } from 'react';
import Button from '../../components/Button/Button';

const SandBoxPage = () => {
  const [counts, setCounts] = useState({ count1: 0, count2: 0 });
  const [sum, setSum] = useState(0);

  const handleIncrement = (id) => {
    setCounts((prev) => ({ ...prev, [id]: prev[id] + 1 }));
  };

  const handleSum = () => {
    setSum(counts.count1 + counts.count2);
  };

  useEffect(() => {
    console.log('Синхронізація! Поточні значення:', counts);
  }, [counts]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10 font-ui">
      <h1 className="text-2xl font-bold tracking-tight text-fg">TEST SANDBOX</h1>

      <div className="w-full space-y-2 rounded-card border border-border bg-surface p-6 text-center text-fg-subtle shadow-btn">
        <p>
          Число 1:{' '}
          <span id="val-count1" className="font-numeric font-semibold">
            {counts.count1}
          </span>
        </p>
        <p>
          Число 2:{' '}
          <span id="val-count2" className="font-numeric font-semibold">
            {counts.count2}
          </span>
        </p>
        <p>
          Сума:{' '}
          <span id="val-sum" className="font-numeric font-semibold text-accent">
            {sum}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" id="btn-count1" onClick={() => handleIncrement('count1')}>
          Number 1+
        </Button>
        <Button variant="primary" id="btn-count2" onClick={() => handleIncrement('count2')}>
          Number 2+
        </Button>
        <Button id="btn-sum" onClick={handleSum}>
          Suma
        </Button>
      </div>
    </div>
  );
};

export default SandBoxPage;
