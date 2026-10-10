import { fenToBoardObject } from '../utils/fenConverter';
import { STARTING_FEN } from './fenConstants';

const positionPart = STARTING_FEN.split(' ')[0];

export const initialBoardPiecesObject = fenToBoardObject(positionPart);
