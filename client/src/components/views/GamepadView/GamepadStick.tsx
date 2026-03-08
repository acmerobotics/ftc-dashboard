import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

interface GamepadStickProps {
  x: number;
  y: number;
  label: string;
  upKey?: string;
  downKey?: string;
  leftKey?: string;
  rightKey?: string;
  // Optional static labels to show when key bindings aren't shown
  upLabel?: string;
  downLabel?: string;
  leftLabel?: string;
  rightLabel?: string;
  isPressed?: boolean;
  buttonKeyBinding?: string;
  onStickButtonClick?: () => void;
  onStickButtonPress?: () => void;
  onStickButtonRelease?: () => void;
  onStickMove?: (x: number, y: number) => void;
  onStickReset?: () => void;
}

export const GamepadStick: React.FC<GamepadStickProps> = ({ 
  x, 
  y, 
  label, 
  upKey, 
  downKey, 
  leftKey, 
  rightKey,
  upLabel,
  downLabel,
  leftLabel,
  rightLabel,
  isPressed,
  buttonKeyBinding,
  onStickButtonClick,
  onStickButtonPress,
  onStickButtonRelease,
  onStickMove,
  onStickReset
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const stickRef = useRef<HTMLDivElement>(null);
  const lastPressedRef = useRef(isPressed);
  const userInteractingRef = useRef(false);
  
  // Detect external changes (e.g., from keyboard) and clear lock
  useEffect(() => {
    // If isPressed changed and we're not in the middle of user interaction, clear lock
    if (isPressed !== lastPressedRef.current && !userInteractingRef.current) {
      setIsLocked(false);
    }
    lastPressedRef.current = isPressed;
  }, [isPressed]);
  
  const normalizedX = 50 + (x * 40);
  const normalizedY = 50 - (y * 40);
  
  const updateStickPosition = React.useCallback((clientX: number, clientY: number) => {
    if (!onStickMove || !stickRef.current) return;
    
    const rect = stickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let newX = ((clientX - centerX) / (rect.width / 2));
    let newY = -((clientY - centerY) / (rect.height / 2));
    
    // Calculate distance from center
    const distance = Math.sqrt(newX * newX + newY * newY);
    
    // Clamp to circular boundary (radius = 1)
    if (distance > 1) {
      newX = newX / distance;
      newY = newY / distance;
    }
    
    // Apply deadzone
    const deadzone = 0.1;
    if (distance < deadzone) {
      newX = 0;
      newY = 0;
    }
    
    onStickMove(newX, newY);
  }, [onStickMove]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateStickPosition(event.clientX, event.clientY);
  };

  const handleMouseMove = React.useCallback((event: MouseEvent) => {
    if (isDragging) {
      updateStickPosition(event.clientX, event.clientY);
    }
  }, [isDragging, updateStickPosition]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = () => {
    if (onStickReset) {
      onStickReset();
    }
  };

  // Stick button handlers (similar to GamepadButton)
  const handleStickButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    userInteractingRef.current = true;
    if (isLocked) {
      // Single click unlocks
      setIsLocked(false);
      if (onStickButtonRelease) {
        onStickButtonRelease();
      }
      userInteractingRef.current = false;
      return;
    }
    if (onStickButtonPress) {
      onStickButtonPress();
    }
  };

  const handleStickButtonMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLocked && onStickButtonRelease) {
      onStickButtonRelease();
    }
    userInteractingRef.current = false;
  };

  const handleStickButtonDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    userInteractingRef.current = true;
    // Double-click locks the button
    setIsLocked(true);
    if (onStickButtonClick) {
      onStickButtonClick();
    }
    // Keep flag set to prevent unlock until next state change
    setTimeout(() => { userInteractingRef.current = false; }, 0);
  };

  const handleStickButtonMouseLeave = () => {
    if (!isLocked && onStickButtonRelease) {
      onStickButtonRelease();
    }
    userInteractingRef.current = false;
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Top key */}
      <div className="h-3 flex items-center justify-center">
        {(upKey || upLabel) && (
          <span className="text-[9px] text-gray-500 dark:text-gray-400">
            {upKey || upLabel}
          </span>
        )}
      </div>
      
      {/* Stick area with left/right keys */}
      <div className="flex items-center gap-2">
        {/* Left key */}
        <div className="w-6 flex items-center justify-end">
          {(leftKey || leftLabel) && (
            <span className="text-[9px] text-gray-500 dark:text-gray-400">
              {leftKey || leftLabel}
            </span>
          )}
        </div>
        
        {/* Stick */}
        <div 
          ref={stickRef}
          className={clsx(
            'relative h-24 w-24 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-pointer transition-colors',
            isDragging 
              ? 'border-blue-500 dark:border-blue-400' 
              : 'hover:border-blue-400 dark:hover:border-blue-500'
          )}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          title="Hold and drag to control, double-click to reset"
        >
          {/* Knob */}
          <div
            className={clsx(
              'absolute h-4 w-4 rounded-full pointer-events-none shadow-sm',
              isPressed 
                ? 'bg-blue-500 dark:bg-blue-400' 
                : 'bg-gray-600 dark:bg-gray-400'
            )}
            style={{
              left: `${normalizedX}%`,
              top: `${normalizedY}%`,
              transform: 'translate(-50%, -50%)',
              transition: 'background-color 0.15s ease',
            }}
          />
          
          {/* Crosshair */}
          <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-gray-300 dark:bg-gray-600 pointer-events-none opacity-40" />
          <div className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2 bg-gray-300 dark:bg-gray-600 pointer-events-none opacity-40" />
        </div>
        
        {/* Right key */}
        <div className="w-6 flex items-center justify-start">
          {(rightKey || rightLabel) && (
            <span className="text-[9px] text-gray-500 dark:text-gray-400">
              {rightKey || rightLabel}
            </span>
          )}
        </div>
      </div>
      
      {/* Bottom key */}
      <div className="h-3 flex items-center justify-center">
        {(downKey || downLabel) && (
          <span className="text-[9px] text-gray-500 dark:text-gray-400">
            {downKey || downLabel}
          </span>
        )}
      </div>
      
      <button
        className={clsx(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-all select-none',
          'hover:scale-105 active:scale-95',
          isPressed
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
          isLocked && 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900'
        )}
        onMouseDown={handleStickButtonMouseDown}
        onMouseUp={handleStickButtonMouseUp}
        onMouseLeave={handleStickButtonMouseLeave}
        onDoubleClick={handleStickButtonDoubleClick}
        title={buttonKeyBinding ? `Key: ${buttonKeyBinding} | Hold or double-click to lock` : 'Hold or double-click to lock'}
      >
        {label}
      </button>
      {buttonKeyBinding && (
        <span className={clsx(
          'text-[9px] opacity-70 leading-none',
          isPressed ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
        )}>
          {buttonKeyBinding}
        </span>
      )}
    </div>
  );
};
