import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import clsx from 'clsx';

import BaseView, {
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
  BaseViewHeading,
  BaseViewIcons,
  BaseViewIconButton,
} from '../BaseView';
import { RootState } from '@/store/reducers';
import { toggleKeyboardMappingEnabled } from '@/store/actions/keyboardMapping';
import { ReactComponent as GamepadIcon } from '@/assets/icons/gamepad.svg';

import { GamepadControls } from './GamepadControls';
import { useGamepadState } from './hooks/useGamepadState';
import { useKeyboardControls } from './hooks/useKeyboardControls';

type GamepadViewProps = BaseViewProps & BaseViewHeadingProps;

const formatKeyName = (keyCode: string) => {
  if (!keyCode) return '';
  if (keyCode === 'ShiftLeft') return 'LShift';
  if (keyCode === 'ShiftRight') return 'RShift';
  if (keyCode === 'Backquote') return '`';
  return keyCode.replace(/^Key/, '').replace(/^Arrow/, '').replace(/^Digit/, '');
};

const GamepadView: React.FC<GamepadViewProps> = ({
  isDraggable = false,
  isUnlocked = false,
}) => {
  const dispatch = useDispatch();
  const [selectedGamepad, setSelectedGamepad] = useState<1 | 2 | 'both'>(1);
  const [keyboardTargetGamepad, setKeyboardTargetGamepad] = useState<1 | 2>(1);
  
  const gamepadConnectionState = useSelector((state: RootState) => state.gamepad);
  const keyboardMappingState = useSelector((state: RootState) => state.keyboardMapping);
  
  const {
    gamepad1State,
    gamepad2State,
    updateGamepadState,
    createButtonToggleHandler,
    resetGamepad,
  } = useGamepadState();

  // Disable all virtual controls if any hardware gamepad is connected
  const anyHardwareConnected = gamepadConnectionState.gamepad1Connected || gamepadConnectionState.gamepad2Connected;

  // Use keyboardTargetGamepad when in both mode, otherwise use selected gamepad
  const keyboardTarget = selectedGamepad === 'both' ? keyboardTargetGamepad : selectedGamepad;

  useKeyboardControls({
    enabled: keyboardMappingState.enabled && !anyHardwareConnected,
    mapping: keyboardMappingState.mapping,
    keyboardTarget: keyboardTarget,
    updateGamepadState,
  });

  const currentGamepadState = selectedGamepad === 1 ? gamepad1State : gamepad2State;

  const handleToggleKeyboard = () => {
    dispatch(toggleKeyboardMappingEnabled(!keyboardMappingState.enabled));
  };

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>
          Gamepad
        </BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton
            onClick={handleToggleKeyboard}
            disabled={anyHardwareConnected}
            className={clsx(
              'transition-colors',
              anyHardwareConnected
                ? 'opacity-50 cursor-not-allowed'
                : keyboardMappingState.enabled 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            title={
              anyHardwareConnected 
                ? 'Keyboard controls disabled when hardware gamepad is connected'
                : keyboardMappingState.enabled 
                  ? 'Disable keyboard controls' 
                  : 'Enable keyboard controls'
            }
          >
            <GamepadIcon className="h-5 w-5" />
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      
      <BaseViewBody className="p-4 space-y-3">
        {/* Simplified Toolbar */}
        <div className="flex items-center gap-2">
          <button
            className={clsx(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              selectedGamepad === 1
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            onClick={() => setSelectedGamepad(1)}
          >
            Gamepad 1 {gamepadConnectionState.gamepad1Connected && '●'}
          </button>
          <button
            className={clsx(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              selectedGamepad === 2
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            onClick={() => setSelectedGamepad(2)}
          >
            Gamepad 2 {gamepadConnectionState.gamepad2Connected && '●'}
          </button>
          <button
            className={clsx(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              selectedGamepad === 'both'
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            onClick={() => setSelectedGamepad('both')}
          >
            Both
          </button>
        </div>

        {/* Keyboard Target Selector (only shown in Both mode) */}
        {selectedGamepad === 'both' && keyboardMappingState.enabled && !anyHardwareConnected && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <GamepadIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              Keyboard controls:
            </span>
            <div className="flex gap-1.5 ml-auto">
              <button
                className={clsx(
                  'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                  keyboardTargetGamepad === 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700'
                )}
                onClick={() => setKeyboardTargetGamepad(1)}
              >
                Gamepad 1
              </button>
              <button
                className={clsx(
                  'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                  keyboardTargetGamepad === 2
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700'
                )}
                onClick={() => setKeyboardTargetGamepad(2)}
              >
                Gamepad 2
              </button>
            </div>
          </div>
        )}
        
        {/* Hardware Connected Warning */}
        {anyHardwareConnected && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
            <span className="text-xs text-green-700 dark:text-green-300 font-medium">
              ● Hardware gamepad connected - UI and keyboard controls are disabled
            </span>
          </div>
        )}

        {/* Gamepad Controls */}
        {selectedGamepad === 'both' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <h3 className="text-sm font-semibold mb-2.5 text-gray-700 dark:text-gray-300">
                Gamepad 1
              </h3>
              <GamepadControls
                gamepadNum={1}
                gamepadState={gamepad1State}
                isHardwareConnected={gamepadConnectionState.gamepad1Connected}
                keyboardTarget={keyboardTarget}
                formatKeyName={formatKeyName}
                keyboardMapping={keyboardMappingState.mapping}
                createButtonToggleHandler={createButtonToggleHandler}
                updateGamepadState={updateGamepadState}
                resetGamepad={resetGamepad}
                anyHardwareConnected={anyHardwareConnected}
                keyboardEnabled={keyboardMappingState.enabled}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2.5 text-gray-700 dark:text-gray-300">
                Gamepad 2
              </h3>
              <GamepadControls
                gamepadNum={2}
                gamepadState={gamepad2State}
                isHardwareConnected={gamepadConnectionState.gamepad2Connected}
                keyboardTarget={keyboardTarget}
                formatKeyName={formatKeyName}
                keyboardMapping={keyboardMappingState.mapping}
                createButtonToggleHandler={createButtonToggleHandler}
                updateGamepadState={updateGamepadState}
                resetGamepad={resetGamepad}
                anyHardwareConnected={anyHardwareConnected}
                keyboardEnabled={keyboardMappingState.enabled}
              />
            </div>
          </div>
        ) : (
          <GamepadControls
            gamepadNum={selectedGamepad as 1 | 2}
            gamepadState={currentGamepadState}
            isHardwareConnected={
              selectedGamepad === 1 
                ? gamepadConnectionState.gamepad1Connected 
                : gamepadConnectionState.gamepad2Connected
            }
            keyboardTarget={selectedGamepad as 1 | 2}
            formatKeyName={formatKeyName}
            keyboardMapping={keyboardMappingState.mapping}
            createButtonToggleHandler={createButtonToggleHandler}
            updateGamepadState={updateGamepadState}
            resetGamepad={resetGamepad}
            anyHardwareConnected={anyHardwareConnected}
            keyboardEnabled={keyboardMappingState.enabled}
          />
        )}
      </BaseViewBody>
    </BaseView>
  );
};

export default GamepadView;

