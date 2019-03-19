/*
 * Some of this gamepad logic is based on FTC Team 731's robotics simulator.
 * https://github.com/nicholasday/robotics-simulator
 */

import { isEqual } from 'lodash';
import {
  gamepadConnected,
  gamepadDisconnected,
  receiveGamepadState
} from '../actions/gamepad';
import GamepadType from '../enums/GamepadType';

const scale = (value, oldMin, oldMax, newMin, newMax) =>
  newMin + (value - oldMin) * (newMax - newMin) / (oldMax - oldMin);

// based on the corresponding function in the SDK Gamepad
const cleanMotionValues = (value, joystickDeadzone, maxMotionRange) => {
  joystickDeadzone = joystickDeadzone || 0.2;
  maxMotionRange = maxMotionRange || 1.0;

  // apply deadzone
  if (-joystickDeadzone < value && value < joystickDeadzone) return 0;

  // apply trim
  if (value > maxMotionRange) return maxMotionRange;
  if (value < -maxMotionRange) return maxMotionRange;

  // scale values between deadzone and trim to 0 and max range
  if (value > 0) {
    return scale(value, joystickDeadzone, maxMotionRange, 0, maxMotionRange);
  } else {
    return scale(value, -joystickDeadzone, -maxMotionRange, 0, -maxMotionRange);
  }
};

const REST_GAMEPAD_STATE = {
  left_stick_x: 0,
  left_stick_y: 0,
  right_stick_x: 0,
  right_stick_y: 0,
  dpad_up: false,
  dpad_down: false,
  dpad_left: false,
  dpad_right: false,
  a: false,
  b: false,
  x: false,
  y: false,
  guide: false,
  start: false,
  back: false,
  left_bumper: false,
  right_bumper: false,
  left_stick_button: false,
  right_stick_button: false,
  left_trigger: 0,
  right_trigger: 0
};

// TODO: verify that the trigger ranges are normal
const extractGamepadState = (gamepad) => {
  const type = GamepadType.getFromGamepad(gamepad);
  if (!GamepadType.isGamepadSupported(type)) {
    throw new Error('Unable to extract state from unsupported gamepad.');
  }

  switch (type) {
  case GamepadType.GENERIC:
    return {
      left_stick_x: cleanMotionValues(gamepad.axes[0]),
      left_stick_y: cleanMotionValues(-gamepad.axes[1]),
      right_stick_x: cleanMotionValues(gamepad.axes[2]),
      right_stick_y: cleanMotionValues(-gamepad.axes[3]),
      dpad_up: gamepad.buttons[12].pressed,
      dpad_down: gamepad.buttons[13].pressed,
      dpad_left: gamepad.buttons[14].pressed,
      dpad_right: gamepad.buttons[15].pressed,
      a: gamepad.buttons[0].pressed,
      b: gamepad.buttons[1].pressed,
      x: gamepad.buttons[2].pressed,
      y: gamepad.buttons[3].pressed,
      guide: false,
      start: gamepad.buttons[9].pressed,
      back: gamepad.buttons[8].pressed,
      left_bumper: gamepad.buttons[4].pressed,
      right_bumper: gamepad.buttons[5].pressed,
      left_stick_button: gamepad.buttons[10].pressed,
      right_stick_button: gamepad.buttons[11].pressed,
      left_trigger: gamepad.buttons[6].value,
      right_trigger: gamepad.buttons[7].value
    };
  case GamepadType.LOGITECH_F310:
    return {
      left_stick_x: cleanMotionValues(gamepad.axes[0]),
      left_stick_y: cleanMotionValues(-gamepad.axes[1]),
      right_stick_x: cleanMotionValues(gamepad.axes[3]),
      right_stick_y: cleanMotionValues(-gamepad.axes[4]),
      dpad_up: gamepad.axes[7] === -1,
      dpad_down: gamepad.axes[7] === 1,
      dpad_left: gamepad.axes[6] === -1,
      dpad_right: gamepad.axes[6] === 1,
      a: gamepad.buttons[0].pressed,
      b: gamepad.buttons[1].pressed,
      x: gamepad.buttons[2].pressed,
      y: gamepad.buttons[3].pressed,
      guide: false,
      start: gamepad.buttons[7].pressed,
      back: gamepad.buttons[6].pressed,
      left_bumper: gamepad.buttons[4].pressed,
      right_bumper: gamepad.buttons[5].pressed,
      left_stick_button: gamepad.buttons[9].pressed,
      right_stick_button: gamepad.buttons[10].pressed,
      left_trigger: gamepad.axes[2],
      right_trigger: gamepad.axes[5]
    };
  default:
    throw new Error(`Unable to handle support gamepad of type ${type}`);
  }
};

let gamepad1Index = -1;
let gamepad2Index = -1;

let lastGamepad1State = {};
let lastGamepad2State = {};

const gamepadMiddleware = store => {
  function updateGamepads() {
    const gamepads = navigator.getGamepads();
    if (gamepads.length === 0) return;

    // check for Start-A/Start-B
    for (let gamepad of navigator.getGamepads()) {
      if (gamepad === null || !gamepad.connected) {
        continue;
      }
      
      const gamepadType = GamepadType.getFromGamepad(gamepad);
      if (!GamepadType.isSupported(gamepadType)) {
        continue;
      }

      const gamepadState = extractGamepadState(gamepad);
      
      // update gamepad 1 & 2 associations
      if (gamepadState.start && gamepadState.a) {
        gamepad1Index = gamepad.index;
        
        store.dispatch(gamepadConnected(1));

        if (gamepad2Index === gamepad1Index) {
          gamepad2Index = -1;
        }
      } else if (gamepadState.start && gamepadState.b) {
        gamepad2Index = gamepad.index;

        store.dispatch(gamepadConnected(2));

        if (gamepad1Index === gamepad2Index) {
          gamepad1Index = -1;
        }
      }

      // actually dispatch motion events
      let gamepad1State;
      if (gamepad1Index !== -1) {
        gamepad1State = extractGamepadState(gamepads[gamepad1Index], 1);
      } else {
        gamepad1State = REST_GAMEPAD_STATE;
      }
      
      let gamepad2State;
      if (gamepad2Index !== -1) {
        gamepad2State = extractGamepadState(gamepads[gamepad1Index], 2);
      } else {
        gamepad2State = REST_GAMEPAD_STATE;
      }

      if (!isEqual(gamepad1State, lastGamepad1State) || !isEqual(gamepad2State, lastGamepad2State)) {
        store.dispatch(receiveGamepadState(gamepad1State, gamepad2State));

        lastGamepad1State = gamepad1State;
        lastGamepad2State = gamepad2State;
      }
    }

    requestAnimationFrame(updateGamepads);
  }

  window.addEventListener('gamepaddisconnected', ({ gamepad }) => {
    if (gamepad1Index === gamepad.index) {
      store.dispatch(gamepadDisconnected(gamepad1Index));
      
      gamepad1Index = -1;
    } else if (gamepad2Index === gamepad.index) {
      store.dispatch(gamepadDisconnected(gamepad2Index));

      gamepad2Index = -1;
    }
  });

  updateGamepads();

  return next => action => next(action);
};

export default gamepadMiddleware;