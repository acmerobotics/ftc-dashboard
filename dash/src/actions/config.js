import { merge } from 'lodash';

export const RECEIVE_CONFIG = 'RECEIVE_CONFIG';
export const GET_CONFIG = 'GET_CONFIG';
export const UPDATE_CONFIG = 'UPDATE_CONFIG';
export const SAVE_CONFIG = 'SAVE_CONFIG';

export const receiveConfig = (config) => ({
  type: RECEIVE_CONFIG,
  data: config
});

export const getConfig = () => ({
  type: GET_CONFIG
});

export const updateConfig = (update) => (
  (dispatch, getState) => {
    const combined = {};

    merge(combined, getState().config, update);

    dispatch({
      type: RECEIVE_CONFIG,
      data: combined
    });
  }
);

export const saveConfig = () => (
  (dispatch, getState) => (
    dispatch({
      type: SAVE_CONFIG,
      data: getState().config
    })
  )
);
