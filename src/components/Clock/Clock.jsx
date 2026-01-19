import React, { useEffect, useState } from 'react';
import styles from './Clock.module.css';

// Функція форматування часу для відображення
const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const Clock = ({ initialTime, color, isActive, onTimeUp, isGameOver }) => {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    setTime(initialTime);
  }, [initialTime]);

  useEffect(() => {
    let interval;

    // БЛОКУВАННЯ: Якщо гра закінчена, інтервал ніколи не створиться
    if (isActive && time > 0 && !isGameOver) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          const newTime = prevTime - 1000;
          if (newTime <= 0) {
            clearInterval(interval);
            onTimeUp(color);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
    // Додаємо isGameOver у залежності
  }, [isActive, time, color, onTimeUp, isGameOver]);

  // === 3. ДИНАМІЧНІ КЛАСИ ТА СТИЛІ ===
  const totalSeconds = Math.floor(time / 1000);
  const isLowTime = totalSeconds < 30 && totalSeconds > 0; // Менше 30 секунд, але не 0

  const baseClass = color === 'w' ? styles.lightClock : styles.darkClock;

  // Стиль, що виділяє активний годинник
  const activeStyle = isActive
    ? { transform: 'scale(1.05)', boxShadow: '0 0 15px rgba(255, 223, 0, 0.8)' }
    : {};

  // Клас для часу, що закінчується
  const lowTimeClass = isLowTime ? styles.lowTime : '';

  return (
    <div
      className={`${styles.clockContainer} ${baseClass}`}
      style={activeStyle}
    >
      <div className={`${styles.timeDisplay} ${lowTimeClass}`}>
        {/* === ВИПРАВЛЕНО: time та formatTime тепер доступні === */}
        {formatTime(time)}
      </div>
    </div>
  );
};

export default Clock;
