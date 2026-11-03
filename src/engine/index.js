// src/engine/index.js
// Публічний фасад шахового рушія — єдині двері в src/engine.
// Див. docs/layer-separation-step3.md.
//
// Redux імпортує рушій лише звідси, не з внутрішніх модулів напряму.
// Внутрішні модулі фасад НЕ імпортують (інакше — циклічні імпорти).

export { applyMove } from './applyMove';
export { getLegalMoves, isMoveLegal } from './legalMoves';
export { getStatus } from './gameStatus';
export { buildSan as toSan } from './notation';
export { getPieceColor, getOpponentColor } from './chessHelpers';
export { requiresPromotion, isValidPromotionPiece } from './promotion';
export { COLORS } from './constants';
