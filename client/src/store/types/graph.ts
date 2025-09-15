export const SAVE_GRAPH_VARIABLES = 'SAVE_GRAPH_VARIABLES';
export const RECEIVE_GRAPH_VARIABLES = 'RECEIVE_GRAPH_VARIABLES';
export const GET_GRAPH_VARIABLES = 'GET_GRAPH_VARIABLES';

export type GraphState = {
  selectedKeys: string[];
  windowMs: number;
};

export type SaveGraphVariablesAction = {
  type: typeof SAVE_GRAPH_VARIABLES;
  selectedKeys: string[];
  windowMs: number;
};

export type ReceiveGraphVariablesAction = {
  type: typeof RECEIVE_GRAPH_VARIABLES;
  selectedKeys: string[];
  windowMs: number;
};

export type GetGraphVariablesAction = {
  type: typeof GET_GRAPH_VARIABLES;
};

export type GraphActions = SaveGraphVariablesAction | ReceiveGraphVariablesAction | GetGraphVariablesAction;
