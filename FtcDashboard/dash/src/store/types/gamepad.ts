export const GAMEPAD_CONNECTED = 'GAMEPAD_CONNECTED';
export const GAMEPAD_DISCONNECTED = 'GAMEPAD_DISCONNECTED';
export const RECEIVE_GAMEPAD_STATE = 'RECEIVE_GAMEPAD_STATE';

export type GamepadConnectionState = {
  gamepad1Connected: boolean;
  gamepad2Connected: boolean;
};

export type GamepadConnectedAction = {
  type: typeof GAMEPAD_CONNECTED;
  user: number;
};

export type GamepadDisonnectedAction = {
  type: typeof GAMEPAD_DISCONNECTED;
  user: number;
};

export type ReceiveGamepadStateAction = {
  type: typeof RECEIVE_GAMEPAD_STATE;
  gamepad1: boolean;
  gamepad2: boolean;
};
