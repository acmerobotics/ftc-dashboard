import { isPlainObject, isEqual, isEmpty } from 'lodash';

export const RECEIVE_CONFIG_OPTIONS = 'RECEIVE_CONFIG_OPTIONS';
export const GET_CONFIG_OPTIONS = 'GET_CONFIG_OPTIONS';
export const UPDATE_CONFIG_OPTIONS = 'UPDATE_CONFIG_OPTIONS';
export const SAVE_CONFIG_OPTIONS = 'SAVE_CONFIG_OPTIONS';
export const RECEIVE_CONFIG_SCHEMA = 'RECEIVE_CONFIG_SCHEMA';

export const receiveConfigOptions = (config) => ({
  type: RECEIVE_CONFIG_OPTIONS,
  data: config
});

export const receiveConfigSchema = (schema) => ({
  type: RECEIVE_CONFIG_SCHEMA,
  data: schema
});

export const getConfigOptions = () => ({
  type: GET_CONFIG_OPTIONS
});

export const updateConfigOptions = (options) => ({
  type: UPDATE_CONFIG_OPTIONS,
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

export const saveConfigOptions = (options) => (
  (dispatch, getState) => {
    const { modifiedOptions } = getState().config;
    const optionsToSave = options || modifiedOptions;

    dispatch({
      type: SAVE_CONFIG_OPTIONS,
      data: optionsToSave
    });

    dispatch(updateConfigOptions(symmetricDifference(modifiedOptions, optionsToSave) || {}));
  }
);