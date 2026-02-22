import { useEffect, useRef } from 'react';
import { GamepadState } from '@/store/types';
import { KeyboardMapping } from '@/store/types/keyboardMapping';

interface UseKeyboardControlsProps {
  enabled: boolean;
  mapping: KeyboardMapping;
  keyboardTarget: 1 | 2;
  updateGamepadState: (gamepadNum: 1 | 2, newState: Partial<GamepadState>) => void;
}

export const useKeyboardControls = ({
  enabled,
  mapping,
  keyboardTarget,
  updateGamepadState,
}: UseKeyboardControlsProps) => {
  // Use ref so the effect closure always has the latest callback
  // without needing to re-register listeners on every state change
  const updateGamepadStateRef = useRef(updateGamepadState);
  useEffect(() => { updateGamepadStateRef.current = updateGamepadState; }, [updateGamepadState]);

  useEffect(() => {
    if (!enabled) return;

    const pressedKeys = new Set<string>();
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default browser behavior for all mapped gamepad keys.
      // This ensures keys like Space, Arrow keys, etc. don't trigger browser actions
      // (e.g., page scrolling) while controlling the gamepad.
      if (Object.values(mapping).includes(event.code)) {
        event.preventDefault();
      }

      if (pressedKeys.has(event.code)) return; // Already pressed
      
      pressedKeys.add(event.code);
      updateAffectedControls(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);
      updateAffectedControls(event.code);
    };

    const updateAffectedControls = (keyCode: string) => {
      // Only update the specific controls affected by this key
      // This preserves UI-set states for all other controls
      const newState: Partial<GamepadState> = {};
      
      // Check if this key affects left stick
      if (keyCode === mapping.left_stick_left || keyCode === mapping.left_stick_right ||
          keyCode === mapping.left_stick_up || keyCode === mapping.left_stick_down) {
        let leftStickX = 0;
        let leftStickY = 0;
        
        if (pressedKeys.has(mapping.left_stick_left || '')) leftStickX -= 1;
        if (pressedKeys.has(mapping.left_stick_right || '')) leftStickX += 1;
        if (pressedKeys.has(mapping.left_stick_up || '')) leftStickY += 1;
        if (pressedKeys.has(mapping.left_stick_down || '')) leftStickY -= 1;
        
        newState.left_stick_x = leftStickX;
        newState.left_stick_y = leftStickY;
      }
      
      // Check if this key affects right stick
      if (keyCode === mapping.right_stick_left || keyCode === mapping.right_stick_right ||
          keyCode === mapping.right_stick_up || keyCode === mapping.right_stick_down) {
        let rightStickX = 0;
        let rightStickY = 0;
        
        if (pressedKeys.has(mapping.right_stick_left || '')) rightStickX -= 1;
        if (pressedKeys.has(mapping.right_stick_right || '')) rightStickX += 1;
        if (pressedKeys.has(mapping.right_stick_up || '')) rightStickY += 1;
        if (pressedKeys.has(mapping.right_stick_down || '')) rightStickY -= 1;
        
        newState.right_stick_x = rightStickX;
        newState.right_stick_y = rightStickY;
      }
      
      // Handle individual digital buttons
      if (keyCode === mapping.dpad_up) newState.dpad_up = pressedKeys.has(mapping.dpad_up);
      if (keyCode === mapping.dpad_down) newState.dpad_down = pressedKeys.has(mapping.dpad_down);
      if (keyCode === mapping.dpad_left) newState.dpad_left = pressedKeys.has(mapping.dpad_left);
      if (keyCode === mapping.dpad_right) newState.dpad_right = pressedKeys.has(mapping.dpad_right);
      
      if (keyCode === mapping.a) newState.a = pressedKeys.has(mapping.a);
      if (keyCode === mapping.b) newState.b = pressedKeys.has(mapping.b);
      if (keyCode === mapping.x) newState.x = pressedKeys.has(mapping.x);
      if (keyCode === mapping.y) newState.y = pressedKeys.has(mapping.y);
      
      if (keyCode === mapping.guide) newState.guide = pressedKeys.has(mapping.guide);
      if (keyCode === mapping.start) newState.start = pressedKeys.has(mapping.start);
      if (keyCode === mapping.back) newState.back = pressedKeys.has(mapping.back);
      
      if (keyCode === mapping.left_bumper) newState.left_bumper = pressedKeys.has(mapping.left_bumper);
      if (keyCode === mapping.right_bumper) newState.right_bumper = pressedKeys.has(mapping.right_bumper);
      
      if (keyCode === mapping.left_stick_button) newState.left_stick_button = pressedKeys.has(mapping.left_stick_button);
      if (keyCode === mapping.right_stick_button) newState.right_stick_button = pressedKeys.has(mapping.right_stick_button);
      
      // Handle triggers (analog)
      if (keyCode === mapping.left_trigger) newState.left_trigger = pressedKeys.has(mapping.left_trigger) ? 1 : 0;
      if (keyCode === mapping.right_trigger) newState.right_trigger = pressedKeys.has(mapping.right_trigger) ? 1 : 0;
      
      // Update the state only if this key actually controls something
      if (Object.keys(newState).length > 0) {
        updateGamepadStateRef.current(keyboardTarget, newState);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      // Release all held keys to prevent stuck controls
      if (pressedKeys.size > 0) {
        const keysToRelease = [...pressedKeys];
        pressedKeys.clear();
        for (const key of keysToRelease) {
          updateAffectedControls(key);
        }
      }
    };
  }, [enabled, mapping, keyboardTarget]);
};
