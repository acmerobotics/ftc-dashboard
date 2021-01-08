import { Values, Extends } from '../../typeHelpers';

import VariableType, {
  VariableBasic,
  VariableCustom,
} from '../../enums/VariableType';

export const RECEIVE_CONFIG = 'RECEIVE_CONFIG';
export const GET_CONFIG = 'GET_CONFIG';
export const UPDATE_CONFIG = 'UPDATE_CONFIG';
export const SAVE_CONFIG = 'SAVE_CONFIG';
export const REFRESH_CONFIG = 'REFRESH_CONFIG';

export type Config = ConfigCustom | ConfigVariable;

export type ConfigCustom = {
  __type: Extends<Values<typeof VariableType>, VariableCustom>;
  __value: Record<string, Config>;
};

export type ConfigVariable = {
  __type: Extends<Values<typeof VariableType>, VariableBasic>;
  __value: number | boolean | string;
  __newValue: number | boolean | string;
  __valid: boolean;
  __modified: boolean;
  __enumClass: string;
  __enumValues: string[];
};

export type ConfigState = {
  configRoot: Config;
};

export type ReceiveConfigAction = {
  type: typeof RECEIVE_CONFIG;
  configRoot: Config;
};

export type GetConfigAction = {
  type: typeof GET_CONFIG;
};
export type UpdateConfigAction = {
  type: typeof UPDATE_CONFIG;
  configDiff: Config;
};
export type SaveConfigAction = {
  type: typeof SAVE_CONFIG;
  configDiff: Config;
};
export type RefreshConfigAction = {
  type: typeof REFRESH_CONFIG;
};
