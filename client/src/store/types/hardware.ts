export type HardwareVar = CustomVar | BasicVar;
export type HardwareVarState = CustomVarState | BasicVarState;

export type CustomVar = {
  __type: 'custom';
  __value: Record<string, HardwareVar> | null;
};

export type CustomVarState = {
  __type: 'custom';
  __value: Record<string, HardwareVarState> | null;
};

export type BasicVar =
  | {
      __type: 'enum';
      // only string is actualy present, but this helps treat vars uniformly
      __value: boolean | number | string | null;
      __enumClass: string;
      __enumValues: string[];
    }
  | {
      __type: 'boolean' | 'int' | 'long' | 'float' | 'double' | 'string';
      __value: boolean | number | string | null;
    };

export type BasicVarState = (
  | {
      __type: 'enum';
      __value: boolean | number | string | null;
      __newValue: boolean | number | string | null;
      __enumClass: string;
      __enumValues: string[];
    }
  | {
      __type: 'boolean' | 'int' | 'long' | 'float' | 'double' | 'string';
      __value: boolean | number | string | null;
      __newValue: boolean | number | string | null;
    }
) & {
  __valid: boolean;
};

export type HardwareState = {
  hardwareRoot: HardwareVarState;
};

export type ReceiveHardwareAction = {
  type: 'RECEIVE_HARDWARE';
  hardwareRoot: HardwareVar;
};

export type GetHardwareAction = {
  type: 'GET_HARDWARE';
};

export type UpdateHardwareAction = {
  type: 'UPDATE_HARDWARE';
  hardwareRoot: HardwareVarState;
};

export type SaveHardwareAction = {
  type: 'SAVE_HARDWARE';
  hardwareDiff: HardwareVar;
};
export type RefreshHardwareAction = {
  type: 'REFRESH_HARDWARE';
};
