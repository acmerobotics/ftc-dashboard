export type ConfigVar = CustomVar | BasicVar;
export type ConfigVarState = CustomVarState | BasicVarState;

export type CustomVar = {
  __type: 'custom';
  __value: Record<string, ConfigVar>;
};

export type CustomVarState = {
  __type: 'custom';
  __value: Record<string, ConfigVarState>;
};

export type BasicVar =
  | {
      __type: 'enum';
      // only string is actualy present, but this helps treat vars uniformly
      __value: boolean | number | string;
      __enumClass: string;
      __enumValues: string[];
    }
  | {
      __type: 'boolean' | 'int' | 'double' | 'string';
      __value: boolean | number | string;
    };

export type BasicVarState = (
  | {
      __type: 'enum';
      __value: boolean | number | string;
      __newValue: boolean | number | string;
      __enumClass: string;
      __enumValues: string[];
    }
  | {
      __type: 'boolean' | 'int' | 'double' | 'string';
      __value: boolean | number | string;
      __newValue: boolean | number | string;
    }
) & {
  __valid: boolean;
};

export type ConfigState = {
  configRoot: ConfigVarState;
};

export type ReceiveConfigAction = {
  type: 'RECEIVE_CONFIG';
  configRoot: ConfigVar;
};

export type GetConfigAction = {
  type: 'GET_CONFIG';
};

export type UpdateConfigAction = {
  type: 'UPDATE_CONFIG';
  configRoot: ConfigVarState;
};

export type SaveConfigAction = {
  type: 'SAVE_CONFIG';
  configDiff: ConfigVar;
};
export type RefreshConfigAction = {
  type: 'REFRESH_CONFIG';
};
