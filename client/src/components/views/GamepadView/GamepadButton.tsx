import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

interface GamepadButtonProps {
  label: string;
  isActive: boolean;
  value?: number;
  className?: string;
  keyBinding?: string;
  onPress?: () => void;
  onRelease?: () => void;
  onToggle?: () => void;
}

export const GamepadButton: React.FC<GamepadButtonProps> = ({ 
  label, 
  isActive, 
  value, 
  className, 
  keyBinding,
  onPress,
  onRelease,
  onToggle
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const lastActiveRef = useRef(isActive);
  const userInteractingRef = useRef(false);
  
  // Detect external changes (e.g., from keyboard) and clear lock
  useEffect(() => {
    // If isActive changed and we're not in the middle of user interaction, clear lock
    if (isActive !== lastActiveRef.current && !userInteractingRef.current) {
      setIsLocked(false);
    }
    lastActiveRef.current = isActive;
  }, [isActive]);
  
  const isAnalog = value !== undefined;
  const displayValue = isAnalog ? (value * 100).toFixed(0) + '%' : label;
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    userInteractingRef.current = true;
    if (isLocked) {
      // Single click unlocks
      setIsLocked(false);
      if (onRelease) {
        onRelease();
      }
      userInteractingRef.current = false;
      return;
    }
    if (onPress) {
      onPress();
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLocked && onRelease) {
      onRelease();
    }
    userInteractingRef.current = false;
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    userInteractingRef.current = true;
    // Double-click locks the button
    setIsLocked(true);
    if (onToggle) {
      onToggle();
    }
    // Keep flag set to prevent unlock until next state change
    setTimeout(() => { userInteractingRef.current = false; }, 0);
  };
  
  const handleMouseLeave = () => {
    if (!isLocked && onRelease) {
      onRelease();
    }
    userInteractingRef.current = false;
  };
  
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className={clsx(
          'flex items-center justify-center rounded-md border h-11 w-11 text-xs font-semibold transition-all select-none',
          'hover:scale-105 active:scale-95',
          isActive 
            ? 'border-blue-500 bg-blue-500 text-white shadow-sm' 
            : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500',
          isLocked && 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900',
          className
        )}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        title={keyBinding ? `Key: ${keyBinding} | Hold or double-click to lock` : 'Hold or double-click to lock'}
      >
        <span>{displayValue}</span>
      </button>
      {keyBinding && (
        <span className={clsx(
          'text-[9px] opacity-70 leading-none',
          isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
        )}>
          {keyBinding}
        </span>
      )}
    </div>
  );
};
