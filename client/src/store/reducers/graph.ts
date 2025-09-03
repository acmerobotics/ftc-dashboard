import {
  GraphState,
  GraphActions,
  RECEIVE_GRAPH_VARIABLES,
} from '@/store/types/graph';
import { DEFAULT_OPTIONS } from '@/components/views/GraphView/Graph';

const initialState: GraphState = {
  selectedKeys: [],
  windowMs: DEFAULT_OPTIONS.windowMs,
};

const graphReducer = (
  state = initialState,
  action: GraphActions,
): GraphState => {
  switch (action.type) {
    case RECEIVE_GRAPH_VARIABLES:
      return {
        selectedKeys: action.selectedKeys,
        windowMs: action.windowMs,
      };
    default:
      return state;
  }
};

export default graphReducer;
