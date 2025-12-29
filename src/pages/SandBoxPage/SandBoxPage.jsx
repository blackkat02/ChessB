import React, { useState, useEffect } from 'react';
// import { useDispatch } from 'react-redux';
import Button from '../../components/Button/Button';
import styles from './SandBoxPage.module.css';

const SandBoxPage = () => {
  const [count, setCount] = useState(0);

  const handleIncrement = () => {
    setCount((prevCount) => prevCount + 1);

    console.log('Кнопку натиснуто!', count);
  };

  return (
    <div className={styles.homePageWrapper}>
      <h1>TEST</h1>
      <p>{count}</p>

      <div className={styles.buttonGroup}>
        <Button
          onClick={handleIncrement}
          id="handleIncrement"
          className={styles.primaryButton}
        >
          Click +1
        </Button>
        <Button
          // onClick={handleSum}
          // id="handleSum"
          className={styles.secondaryButton}
        >
          Suma
        </Button>
      </div>
    </div>
  );
};

export default SandBoxPage;
