export const INIT_OP_MODE = 'INIT_OP_MODE';
export const START_OP_MODE = 'START_OP_MODE';
export const STOP_OP_MODE = 'STOP_OP_MODE';

export const initOpMode = (opModeName) => ({
  type: INIT_OP_MODE,
  opModeName
});

export const startOpMode = () => ({
  type: START_OP_MODE
});

export const stopOpMode = () => ({
  type: STOP_OP_MODE
});