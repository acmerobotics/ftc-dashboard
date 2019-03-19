import { 
  GAMEPAD_CONNECTED,
  GAMEPAD_DISCONNECTED
} from '../actions/gamepad';

const initialState = {
  gamepad1Connected: false,
  gamepad2Connected: false
};

const gamepad = (state = initialState, action) => {
  switch (action.type) {
  case GAMEPAD_CONNECTED:
    if (action.user === 1) {
      return {
        ...state,
        gamepad1Connected: true
      };
    } else {
      return {
        ...state,
        gamepad2Connected: true
      };
    }
  case GAMEPAD_DISCONNECTED:
    if (action.user === 1) {
      return {
        ...state,
        gamepad1Connected: false
      };
    } else {
      return {
        ...state,
        gamepad2Connected: false
      };
    }
  default:
    return state;
  }
};

export default gamepad;
