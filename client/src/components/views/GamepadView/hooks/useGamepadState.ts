import { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { GamepadState } from '@/store/types';
import { sendGamepadState } from '@/store/actions/gamepad';
import { AppThunkDispatch } from '@/store/reducers';

const createInitialGamepadState = (): GamepadState => ({
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
  right_trigger: 0,
});

export const useGamepadState = () => {
  const dispatch = useDispatch<AppThunkDispatch>();
  const [gamepad1State, setGamepad1State] = useState<GamepadState>(createInitialGamepadState());
  const [gamepad2State, setGamepad2State] = useState<GamepadState>(createInitialGamepadState());

  // Use refs to track the latest state for the interval
  const gamepad1StateRef = useRef(gamepad1State);
  const gamepad2StateRef = useRef(gamepad2State);

  // Send state every 100ms to keep the RC watchdog alive
  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch(sendGamepadState(gamepad1StateRef.current, gamepad2StateRef.current));
    }, 100);

    return () => clearInterval(intervalId);
  }, [dispatch]);

  const updateGamepadState = useCallback((gamepadNum: 1 | 2, newState: Partial<GamepadState>) => {
    if (gamepadNum === 1) {
      setGamepad1State(prev => {
        const updatedState = { ...prev, ...newState };
        gamepad1StateRef.current = updatedState;
        return updatedState;
      });
      dispatch(sendGamepadState({ ...gamepad1StateRef.current, ...newState }, gamepad2StateRef.current));
    } else {
      setGamepad2State(prev => {
        const updatedState = { ...prev, ...newState };
        gamepad2StateRef.current = updatedState;
        return updatedState;
      });
      dispatch(sendGamepadState(gamepad1StateRef.current, { ...gamepad2StateRef.current, ...newState }));
    }
  }, [dispatch]);

  return {
    gamepad1State,
    gamepad2State,
    updateGamepadState,
  };
};

export const createButtonToggleHandler = (
  gamepadState: GamepadState,
  gamepadNum: 1 | 2,
  buttonKey: keyof GamepadState,
  updateGamepadState: (gamepadNum: 1 | 2, newState: Partial<GamepadState>) => void,
) => {
  return () => {
    const currentValue = gamepadState[buttonKey];
    const newValue = typeof currentValue === 'number'
      ? (currentValue > 0 ? 0 : 1)
      : !currentValue;
    updateGamepadState(gamepadNum, { [buttonKey]: newValue });
  };
};

export const resetGamepad = (
  gamepadNum: 1 | 2,
  updateGamepadState: (gamepadNum: 1 | 2, newState: Partial<GamepadState>) => void,
) => {
  const neutralState = createInitialGamepadState();
  updateGamepadState(gamepadNum, neutralState);
};
