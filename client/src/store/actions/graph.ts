import {
  GraphState,
  SAVE_GRAPH_VARIABLES,
  RECEIVE_GRAPH_VARIABLES,
  GET_GRAPH_VARIABLES,
} from '@/store/types/graph';

export const saveGraphVariables = (selectedKeys: string[], windowMs: number) => ({
  type: SAVE_GRAPH_VARIABLES,
  selectedKeys,
  windowMs,
});

export const receiveGraphVariables = (selectedKeys: string[], windowMs: number) => ({
  type: RECEIVE_GRAPH_VARIABLES,
  selectedKeys,
  windowMs,
});

export const getGraphVariables = () => ({
  type: GET_GRAPH_VARIABLES,
});
