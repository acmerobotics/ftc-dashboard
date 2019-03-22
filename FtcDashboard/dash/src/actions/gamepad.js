export const GAMEPAD_CONNECTED = 'GAMEPAD_CONNECTED';
export const GAMEPAD_DISCONNECTED = 'GAMEPAD_DISCONNECTED';
export const RECEIVE_GAMEPAD_STATE = 'RECEIVE_GAMEPAD_STATE';

export const gamepadConnected = (user) => ({
  type: GAMEPAD_CONNECTED,
  user
});

export const gamepadDisconnected = (user) => ({
  type: GAMEPAD_DISCONNECTED,
  user
});

export const receiveGamepadState = (gamepad1, gamepad2) => ({
  type: RECEIVE_GAMEPAD_STATE,
  gamepad1,
  gamepad2
});