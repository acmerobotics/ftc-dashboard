export const RECEIVE_CONFIG = 'RECEIVE_CONFIG';
export const GET_CONFIG = 'GET_CONFIG';
export const UPDATE_CONFIG = 'UPDATE_CONFIG';
export const SAVE_CONFIG = 'SAVE_CONFIG';
export const REFRESH_CONFIG = 'REFRESH_CONFIG';

export const receiveConfig = (config) => ({
  type: RECEIVE_CONFIG,
  config
});

export const getConfig = () => ({
  type: GET_CONFIG
});

export const updateConfig = (configDiff) => ({
  type: UPDATE_CONFIG,
  configDiff
});

export const saveConfig = (configDiff) => ({
  type: SAVE_CONFIG,
  configDiff
});

export const refreshConfig = () => ({
  type: REFRESH_CONFIG
});