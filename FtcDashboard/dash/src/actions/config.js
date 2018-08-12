import { isPlainObject, isEqual, isEmpty } from 'lodash';
import OptionType from '../enums/OptionType';

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

const getValidOptions = (schema, modifiedOptions) => {
  const type = OptionType.getFromSchema(schema);
  if (type === OptionType.CUSTOM) {
    const obj = {};
    Object.keys(schema).forEach((key) => {
      if (!modifiedOptions) {
        return;
      }

      const validOptions = getValidOptions(schema[key], modifiedOptions[key]);
      if (!isPlainObject(validOptions) || Object.keys(validOptions).length > 0) {
        obj[key] = validOptions;
      }
    });
    return obj;
  } else if (modifiedOptions && modifiedOptions.valid) {
    return modifiedOptions.value;
  } else {
    return {};
  }
};

const mapObjectValues = (obj, fn) => {
  if (isPlainObject(obj)) {
    const newObj = {};
    Object.keys(obj).forEach((key) => {
      newObj[key] = mapObjectValues(obj[key], fn);
    });
    return newObj;
  } else {
    return fn(obj);
  }
};

export const saveConfigOptions = (options) => (
  (dispatch, getState) => {
    const { schema, modifiedOptions } = getState().config;
    const validModifiedOptions = getValidOptions(schema, modifiedOptions);
    const optionsToSave = options || validModifiedOptions;

    dispatch({
      type: SAVE_CONFIG_OPTIONS,
      data: optionsToSave
    });

    const diff = symmetricDifference(validModifiedOptions, optionsToSave) || {};
    
    dispatch(updateConfigOptions(mapObjectValues(diff, (value) => ({
      value,
      valid: true
    }))));
  }
);