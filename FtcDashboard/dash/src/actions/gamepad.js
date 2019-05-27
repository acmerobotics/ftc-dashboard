import { isEqual } from 'lodash';

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

/*
To save bandwidth, new gamepad states are only sent if they differ from the previous.
However, the dash regardless still sends gamepad messages at the rate below to feed
the watchdog on the RC (to reset the gamepads in case the connection is cut abruptly).
*/
const MAX_GAMEPAD_MS = 150;

let lastGamepad1, lastGamepad2;
let lastGamepadTimestamp;

export const sendGamepadState = (gamepad1, gamepad2) => (
  (dispatch) => {
    const timestamp = Date.now();
    if (!isEqual(lastGamepad1, gamepad1) || !isEqual(lastGamepad2, gamepad2) || 
        (timestamp - lastGamepadTimestamp) < MAX_GAMEPAD_MS) {
      dispatch(receiveGamepadState(gamepad1, gamepad2));
      
      lastGamepad1 = gamepad1;
      lastGamepad2 = gamepad2;
      lastGamepadTimestamp = timestamp;
    }
  }
);