import React from 'react';
import clsx from 'clsx';
import { ValResult } from '@/components/inputs/validation';

interface Props<T> {
  id?: string;
  value: string | number;
  valid: boolean;
  validate: (rawValue: string) => ValResult<T>;
  onChange: (arg: ValResult<T>) => void;
  onSave?: () => void;
  showArrows?: boolean;
  step?: number;
  readOnly?: boolean;
}

const TextInput = <T,>({
  id,
  value,
  valid,
  validate,
  onChange,
  onSave,
  showArrows = false,
  step = 1,
  readOnly = false,
}: Props<T>) => {
  const [inputValue, setInputValue] = React.useState(`${value}`);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(valid ? '' : 'Invalid input');
  }, [valid]);

  React.useEffect(() => {
    if (value !== validate(inputValue).value) {
      setInputValue(`${value}`);
    }
  }, [value, validate, inputValue]);

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(evt.target.value);
    const validated = validate(evt.target.value);
    if (validated) {
      onChange(validated);
    }
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (onSave && evt.keyCode === 13) onSave();
    if (showArrows) {
      if (evt.key === 'ArrowUp') {
        evt.preventDefault();
        doIncrement(1);
      } else if (evt.key === 'ArrowDown') {
        evt.preventDefault();
        doIncrement(-1);
      }
    }
  };

  const doIncrement = (delta: number) => {
    const raw = inputValue.trim();
    let current = Number(raw);
    if (!isFinite(current)) {
      current = Number(value as number);
      if (!isFinite(current)) return;
    }

    let incrementValue: number;
    let precision: number;

    if (raw.includes('.')) {
      const decimalPart = raw.split('.')[1] || '';
      precision = decimalPart.length;
      
      if (precision === 0) {
        precision = 1;
      }
      
      incrementValue = Math.pow(10, -precision);
    } else {
      incrementValue = 1;
      precision = 0;
    }

    const rawNext = current + (delta > 0 ? incrementValue : -incrementValue);
    const factor = Math.pow(10, precision);
    const rounded = Math.round(rawNext * factor) / factor;
    const normalized = Object.is(rounded, -0) ? 0 : rounded;
    
    let nextStr: string;
    if (precision > 0) {
      nextStr = normalized.toFixed(precision);
    } else {
      nextStr = `${normalized}`;
    }

    setInputValue(nextStr);
    const validated = validate(nextStr);
    if (validated) {
      onChange(validated as ValResult<T>);
    }
  };

  return (
    <div className="relative inline-block">
      <input
        id={id}
        className={clsx(
          'rounded border border-gray-200 bg-gray-100 px-3 py-1 transition focus:border-primary-500 focus:ring-primary-500',
          'dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200',
          !valid && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          showArrows && 'pr-8',
        )}
        ref={inputRef}
        type="text"
        size={15}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
      />

      {showArrows && (
        <div className="pointer-events-none absolute right-1 top-0 bottom-0 flex h-full flex-col justify-center">
          <div className="pointer-events-auto flex flex-col">
            <button
              type="button"
              aria-label="increment"
              className="h-3 rounded-t border border-gray-200 bg-gray-100 px-1 text-[10px] leading-none hover:bg-gray-200 dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              onClick={() => doIncrement(1)}
            >
              ▲
            </button>
            <button
              type="button"
              aria-label="decrement"
              className="h-3 rounded-b border border-gray-200 bg-gray-100 px-1 text-[10px] leading-none hover:bg-gray-200 dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              onClick={() => doIncrement(-1)}
            >
              ▼
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextInput;
