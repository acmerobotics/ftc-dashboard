// import { merge } from 'lodash';

export const RECEIVE_CONFIG = 'RECEIVE_CONFIG';
export const GET_CONFIG = 'GET_CONFIG';
export const UPDATE_CONFIG = 'UPDATE_CONFIG';
export const SAVE_CONFIG = 'SAVE_CONFIG';
export const RECEIVE_CONFIG_SCHEMA = 'RECEIVE_CONFIG_SCHEMA';
export const RECEIVE_MODIFIED_CONFIG = 'RECEIVE_MODIFIED_CONFIG';

export const receiveConfig = (config) => ({
  type: RECEIVE_CONFIG,
  data: config
});

export const receiveConfigSchema = (schema) => ({
  type: RECEIVE_CONFIG_SCHEMA,
  data: schema
});

export const getConfig = () => ({
  type: GET_CONFIG
});

export const updateConfig = (modifiedOptions) => ({
  type: RECEIVE_MODIFIED_CONFIG,
  data: modifiedOptions
});

export const saveConfig = () => (
  (dispatch, getState) => {
    dispatch({
      type: SAVE_CONFIG,
      data: getState().config.modifiedOptions
    });

    dispatch(updateConfig({}));
  }
);
