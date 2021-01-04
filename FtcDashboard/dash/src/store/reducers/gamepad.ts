import {
  GAMEPAD_CONNECTED,
  GAMEPAD_DISCONNECTED,
  GamepadConnectedAction,
  GamepadDisonnectedAction,
} from '../actions/gamepad';

export type GamepadConnectionState = {
  gamepad1Connected: boolean;
  gamepad2Connected: boolean;
};

const initialState: GamepadConnectionState = {
  gamepad1Connected: false,
  gamepad2Connected: false,
};

const gamepad = (
  state: GamepadConnectionState = initialState,
  action: GamepadConnectedAction | GamepadDisonnectedAction,
): GamepadConnectionState => {
  switch (action.type) {
    case GAMEPAD_CONNECTED:
      if (action.user === 1) {
        return {
          ...state,
          gamepad1Connected: true,
        };
      } else {
        return {
          ...state,
          gamepad2Connected: true,
        };
      }
    case GAMEPAD_DISCONNECTED:
      if (action.user === 1) {
        return {
          ...state,
          gamepad1Connected: false,
        };
      } else {
        return {
          ...state,
          gamepad2Connected: false,
        };
      }
    default:
      return state;
  }
};

export default gamepad;
