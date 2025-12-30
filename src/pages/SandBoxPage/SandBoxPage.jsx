import React, { useState, useEffect } from 'react';
import Button from '../../components/Button/Button';
import styles from './SandBoxPage.module.css';

const SandBoxPage = () => {
  const [counts, setCounts] = useState({ count1: 0, count2: 0 });
  const [sum, setSum] = useState(0);

  const handleIncrement = (id) => {
    setCounts((prev) => ({
      ...prev,
      [id]: prev[id] + 1,
    }));
    console.log(`${id} змінено!`);
  };

  const handleSum = () => {
    setSum(counts.count1 + counts.count2);
  };

  useEffect(() => {
    console.log('Синхронізація! Поточні значення:', counts);
  }, [counts]);

  return (
    <div className={styles.homePageWrapper}>
      <h1>TEST SANDBOX</h1>
      <div className={styles.display}>
        <p>
          Число 1: <span id="val-count1">{counts.count1}</span>
        </p>
        <p>
          Число 2: <span id="val-count2">{counts.count2}</span>
        </p>
        <p>
          Сума: <span id="val-sum">{sum}</span>
        </p>
      </div>

      <div className={styles.buttonGroup}>
        <Button
          onClick={() => handleIncrement('count1')}
          id="btn-count1"
          className={styles.primaryButton}
        >
          Number 1+
        </Button>

        <Button
          onClick={() => handleIncrement('count2')}
          id="btn-count2"
          className={styles.primaryButton}
        >
          Number 2+
        </Button>

        <Button
          onClick={handleSum}
          id="btn-sum"
          className={styles.secondaryButton}
        >
          Suma
        </Button>
      </div>
    </div>
  );
};

export default SandBoxPage;
