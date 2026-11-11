import { createAction } from '@reduxjs/toolkit';

// Події партії. Модуль свідомо не імпортує жодного слайсу: на ці події
// реагують кілька слайсів (docs/layer-separation-step4.md, 4.2–4.4), і
// слайси не повинні залежати один від одного.
// Типи 'game/...' збережені з часів gameSlice.actions — на них зав'язаний
// persist (PERSIST_ON у store.js) і вже збережені партії.
export const moveExecuted = createAction('game/moveExecuted');
export const newGameStarted = createAction('game/newGameStarted');

// Date.now() тут, у prepare, а не в редюсері: редюсер лишається чистим
// (docs/archive/layer-separation-step3.md, 3.6).
export const endGame = createAction('game/endGame', (payload) => ({
  payload: { timestamp: Date.now(), ...payload },
}));
