// src/storage/localStorageService.js

const STORAGE_KEY = 'chess_game_state';

/**
 * Завантажує останній збережений стан гри з LocalStorage.
 * @returns {object | null} Збережений об'єкт стану або null, якщо не знайдено.
 */
export const loadGameState = () => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return undefined; // React очікує undefined, щоб використати початковий стан
        }
        return JSON.parse(serializedState);
    } catch (e) {
        console.error("Помилка завантаження стану з LocalStorage:", e);
        return undefined;
    }
};

/**
 * Зберігає поточний стан гри в LocalStorage.
 * @param {object} state - Об'єкт поточного стану гри.
 */
export const saveGameState = (state) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (e) {
        console.error("Помилка збереження стану в LocalStorage:", e);
        // Ігноруємо помилки, наприклад, коли сховище переповнене
    }
};

export const clearGameState = () => { // <--- НОВА ФУНКЦІЯ
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log("🔥 Локальний стан гри очищено.");
    } catch (e) {
        console.error("Помилка очищення LocalStorage:", e);
    }
};

// Можна додати функцію clearGameState, якщо потрібно
// export const clearGameState = () => { localStorage.removeItem(STORAGE_KEY); };