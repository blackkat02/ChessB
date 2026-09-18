import { useSelector } from 'react-redux';
import { selectMovePairs } from '../../redux/game/gameSelectors';
import MoveListView from './MoveListView';

const MoveListContainer = () => {
  const movePairs = useSelector(selectMovePairs);
  return <MoveListView movePairs={movePairs} />;
};

export default MoveListContainer;
