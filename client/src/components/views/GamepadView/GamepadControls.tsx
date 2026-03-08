import React from 'react';
import clsx from 'clsx';
import { GamepadState } from '@/store/types';
import { KeyboardMapping } from '@/store/types/keyboardMapping';
import { GamepadButton } from './GamepadButton';
import { GamepadStick } from './GamepadStick';
import { GamepadSlider } from './GamepadSlider';

interface GamepadControlsProps {
  gamepadNum: 1 | 2;
  gamepadState: GamepadState;
  isHardwareConnected: boolean;
  keyboardTarget: 1 | 2;
  formatKeyName: (keyCode: string) => string;
  keyboardMapping: KeyboardMapping;
  createButtonToggleHandler: (gamepadNum: 1 | 2, buttonKey: keyof GamepadState) => () => void;
  updateGamepadState: (gamepadNum: 1 | 2, newState: Partial<GamepadState>) => void;
  resetGamepad: (gamepadNum: 1 | 2) => void;
  anyHardwareConnected: boolean;
  keyboardEnabled: boolean;
}

export const GamepadControls: React.FC<GamepadControlsProps> = ({
  gamepadNum,
  gamepadState,
  isHardwareConnected,
  keyboardTarget,
  formatKeyName,
  keyboardMapping,
  createButtonToggleHandler,
  updateGamepadState,
  resetGamepad,
  anyHardwareConnected,
  keyboardEnabled,
}) => {
  const showKeyBindings = keyboardEnabled && gamepadNum === keyboardTarget;

  // Helper to create press handler (set button to true) - disabled if hardware connected
  const createButtonPressHandler = (buttonKey: keyof GamepadState) => () => {
    if (anyHardwareConnected) return;
    const currentValue = gamepadState[buttonKey];
    const newValue = typeof currentValue === 'number' ? 1 : true;
    updateGamepadState(gamepadNum, { [buttonKey]: newValue });
  };

  // Helper to create release handler (set button to false) - disabled if hardware connected
  const createButtonReleaseHandler = (buttonKey: keyof GamepadState) => () => {
    if (anyHardwareConnected) return;
    const currentValue = gamepadState[buttonKey];
    const newValue = typeof currentValue === 'number' ? 0 : false;
    updateGamepadState(gamepadNum, { [buttonKey]: newValue });
  };

  // Wrapper for slider onChange - disabled if hardware connected
  const handleSliderChange = (key: keyof GamepadState) => (value: number) => {
    if (anyHardwareConnected) return;
    updateGamepadState(gamepadNum, { [key]: value });
  };

  // Wrapper for stick movement - disabled if hardware connected
  const handleStickMove = (xKey: keyof GamepadState, yKey: keyof GamepadState) => (x: number, y: number) => {
    if (anyHardwareConnected) return;
    updateGamepadState(gamepadNum, { [xKey]: x, [yKey]: y });
  };

  // Wrapper for stick reset - disabled if hardware connected
  const handleStickReset = (xKey: keyof GamepadState, yKey: keyof GamepadState) => () => {
    if (anyHardwareConnected) return;
    updateGamepadState(gamepadNum, { [xKey]: 0, [yKey]: 0 });
  };

  return (
    <div className={clsx('space-y-3', anyHardwareConnected && 'opacity-60 pointer-events-none')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={clsx(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            isHardwareConnected 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          )}>
            {isHardwareConnected ? '● Hardware' : '○ Virtual'}
          </span>
        </div>
        <button
          className="px-2.5 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors font-medium"
          onClick={() => resetGamepad(gamepadNum)}
        >
          Reset
        </button>
      </div>

      {/* Controller Layout */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        {/* Triggers & Bumpers */}
        <div className="flex justify-between mb-4 gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <GamepadButton
              label="LB"
              isActive={gamepadState.left_bumper}
              keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.left_bumper || '') : ''}
              onPress={createButtonPressHandler('left_bumper')}
              onRelease={createButtonReleaseHandler('left_bumper')}
              onToggle={createButtonToggleHandler(gamepadNum, 'left_bumper')}
            />
            <GamepadSlider
              label="LT"
              value={gamepadState.left_trigger}
              keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.left_trigger || '') : ''}
              onChange={handleSliderChange('left_trigger')}
            />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <GamepadButton
              label="RB"
              isActive={gamepadState.right_bumper}
              keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.right_bumper || '') : ''}
              onPress={createButtonPressHandler('right_bumper')}
              onRelease={createButtonReleaseHandler('right_bumper')}
              onToggle={createButtonToggleHandler(gamepadNum, 'right_bumper')}
            />
            <GamepadSlider
              label="RT"
              value={gamepadState.right_trigger}
              keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.right_trigger || '') : ''}
              onChange={handleSliderChange('right_trigger')}
            />
          </div>
        </div>

        {/* Main Controls Area */}
        <div className="flex justify-between items-start gap-3">
          {/* Left: Stick + D-Pad */}
          <div className="flex flex-col gap-3 items-center">
            <GamepadStick
              x={gamepadState.left_stick_x}
              y={gamepadState.left_stick_y}
              label="L3"
              upKey={showKeyBindings ? formatKeyName(keyboardMapping.left_stick_up || '') : ''}
              downKey={showKeyBindings ? formatKeyName(keyboardMapping.left_stick_down || '') : ''}
              leftKey={showKeyBindings ? formatKeyName(keyboardMapping.left_stick_left || '') : ''}
              rightKey={showKeyBindings ? formatKeyName(keyboardMapping.left_stick_right || '') : ''}
              upLabel="Up"
              downLabel="Down"
              leftLabel="Left"
              rightLabel="Right"
              isPressed={gamepadState.left_stick_button}
              buttonKeyBinding={showKeyBindings ? formatKeyName(keyboardMapping.left_stick_button || '') : ''}
              onStickButtonClick={createButtonToggleHandler(gamepadNum, 'left_stick_button')}
              onStickButtonPress={createButtonPressHandler('left_stick_button')}
              onStickButtonRelease={createButtonReleaseHandler('left_stick_button')}
              onStickMove={handleStickMove('left_stick_x', 'left_stick_y')}
              onStickReset={handleStickReset('left_stick_x', 'left_stick_y')}
            />
            
            {/* D-Pad */}
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              <div />
              <GamepadButton
                label="↑"
                isActive={gamepadState.dpad_up}
                keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.dpad_up || '') : ''}
                onPress={createButtonPressHandler('dpad_up')}
                onRelease={createButtonReleaseHandler('dpad_up')}
                onToggle={createButtonToggleHandler(gamepadNum, 'dpad_up')}
              />
              <div />
              <GamepadButton
                label="←"
                isActive={gamepadState.dpad_left}
                keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.dpad_left || '') : ''}
                onPress={createButtonPressHandler('dpad_left')}
                onRelease={createButtonReleaseHandler('dpad_left')}
                onToggle={createButtonToggleHandler(gamepadNum, 'dpad_left')}
              />
              <div />
              <GamepadButton
                label="→"
                isActive={gamepadState.dpad_right}
                keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.dpad_right || '') : ''}
                onPress={createButtonPressHandler('dpad_right')}
                onRelease={createButtonReleaseHandler('dpad_right')}
                onToggle={createButtonToggleHandler(gamepadNum, 'dpad_right')}
              />
              <div />
              <GamepadButton
                label="↓"
                isActive={gamepadState.dpad_down}
                keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.dpad_down || '') : ''}
                onPress={createButtonPressHandler('dpad_down')}
                onRelease={createButtonReleaseHandler('dpad_down')}
                onToggle={createButtonToggleHandler(gamepadNum, 'dpad_down')}
              />
              <div />
            </div>
          </div>

          {/* Center: Menu Buttons */}
          <div className="flex flex-col gap-1.5 justify-center items-center">
            <GamepadButton
              label="◀"
              isActive={gamepadState.back}
              keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.back || '') : ''}
              onPress={createButtonPressHandler('back')}
              onRelease={createButtonReleaseHandler('back')}
              onToggle={createButtonToggleHandler(gamepadNum, 'back')}
              className="rounded-full"
            />
            <GamepadButton
              label="⌂"
              isActive={gamepadState.guide}
              keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.guide || '') : ''}
              onPress={createButtonPressHandler('guide')}
              onRelease={createButtonReleaseHandler('guide')}
              onToggle={createButtonToggleHandler(gamepadNum, 'guide')}
              className="rounded-full"
            />
            <GamepadButton
              label="▶"
              isActive={gamepadState.start}
              keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.start || '') : ''}
              onPress={createButtonPressHandler('start')}
              onRelease={createButtonReleaseHandler('start')}
              onToggle={createButtonToggleHandler(gamepadNum, 'start')}
              className="rounded-full"
            />
          </div>

          {/* Right: Face Buttons + Stick */}
          <div className="flex flex-col gap-3 items-center">
            {/* Face Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <div />
              <GamepadButton
                label="Y"
                isActive={gamepadState.y}
                keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.y || '') : ''}
                onPress={createButtonPressHandler('y')}
                onRelease={createButtonReleaseHandler('y')}
                onToggle={createButtonToggleHandler(gamepadNum, 'y')}
              />
              <div />
              <GamepadButton
                label="X"
                isActive={gamepadState.x}
                keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.x || '') : ''}
                onPress={createButtonPressHandler('x')}
                onRelease={createButtonReleaseHandler('x')}
                onToggle={createButtonToggleHandler(gamepadNum, 'x')}
              />
              <div />
              <GamepadButton
                label="B"
                isActive={gamepadState.b}
                keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.b || '') : ''}
                onPress={createButtonPressHandler('b')}
                onRelease={createButtonReleaseHandler('b')}
                onToggle={createButtonToggleHandler(gamepadNum, 'b')}
              />
              <div />
              <GamepadButton
                label="A"
                isActive={gamepadState.a}
                keyBinding={showKeyBindings ? formatKeyName(keyboardMapping.a || '') : ''}
                onPress={createButtonPressHandler('a')}
                onRelease={createButtonReleaseHandler('a')}
                onToggle={createButtonToggleHandler(gamepadNum, 'a')}
              />
              <div />
            </div>
            
            <GamepadStick
              x={gamepadState.right_stick_x}
              y={gamepadState.right_stick_y}
              label="R3"
              upKey={showKeyBindings ? formatKeyName(keyboardMapping.right_stick_up || '') : ''}
              downKey={showKeyBindings ? formatKeyName(keyboardMapping.right_stick_down || '') : ''}
              leftKey={showKeyBindings ? formatKeyName(keyboardMapping.right_stick_left || '') : ''}
              rightKey={showKeyBindings ? formatKeyName(keyboardMapping.right_stick_right || '') : ''}
              upLabel="Up"
              downLabel="Down"
              leftLabel="Left"
              rightLabel="Right"
              isPressed={gamepadState.right_stick_button}
              buttonKeyBinding={showKeyBindings ? formatKeyName(keyboardMapping.right_stick_button || '') : ''}
              onStickButtonClick={createButtonToggleHandler(gamepadNum, 'right_stick_button')}
              onStickButtonPress={createButtonPressHandler('right_stick_button')}
              onStickButtonRelease={createButtonReleaseHandler('right_stick_button')}
              onStickMove={handleStickMove('right_stick_x', 'right_stick_y')}
              onStickReset={handleStickReset('right_stick_x', 'right_stick_y')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
