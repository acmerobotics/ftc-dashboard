import { isPlainObject, isEqual, isEmpty } from 'lodash';

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

export const updateConfig = (options) => ({
  type: RECEIVE_MODIFIED_CONFIG,
  data: options
});

// XOR for sets
const symmetricDifference = (a, b) => {
  if (!a || !b) {
    return a || b;
  } else if (isPlainObject(a) || isPlainObject(b)) {
    const diffObj = {};
    Object.keys(a || b).forEach((key) => {
      const diff = symmetricDifference(a[key], b[key]);
      if (diff) {
        diffObj[key] = diff;
      }
    });
    return isEmpty(diffObj) ? undefined : diffObj;
  } else {
    return isEqual(a, b) ? undefined : a || b;
  }
};

export const saveConfig = (options) => (
  (dispatch, getState) => {
    const { modifiedOptions } = getState().config;
    const optionsToSave = options || modifiedOptions;

    dispatch({
      type: SAVE_CONFIG,
      data: optionsToSave
    });

    dispatch(updateConfig(symmetricDifference(modifiedOptions, optionsToSave) || {}));
  }
);