import React from 'react';
import clsx from 'clsx';
import { ValResult, validateDouble } from '@/components/inputs/validation';

interface Props<T> {
  id?: string;
  value: string | number;
  valid: boolean;
  validate: (rawValue: string) => ValResult<T>;
  onChange: (arg: ValResult<T>) => void;
  onSave?: () => void;
  showArrows?: boolean;
  readOnly?: boolean;
}

function countDecimalPlaces(str: string) {
  if (!validateDouble(str).valid) {
    return 0;
  }

  const parts = str.trim().split('.');
  if (parts.length <= 1) {
    return 0;
  }
  return parts[1].length;
}

const TextInput = <T,>({
  id,
  value,
  valid,
  validate,
  onChange,
  onSave,
  showArrows = false,
  readOnly = false,
}: Props<T>) => {
  const [inputValue, setInputValue] = React.useState(`${value}`);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(valid ? '' : 'Invalid input');
  }, [valid]);

  React.useEffect(() => {
    const validated = validate(inputValue);
    if (validated.valid && value !== validated.value) {
      setInputValue(`${value}`);
    }
  }, [value, validate, inputValue]);


  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { inputType } = evt.nativeEvent as InputEvent;
    // Firefox uses insertReplacementText for the arrows while Chrome uses undefined.
    const fromArrows = showArrows && (inputType === "insertReplacementText" || inputType === undefined);
    setInputValue(fromArrows ? Number(evt.target.value).toFixed(countDecimalPlaces(inputValue)) : evt.target.value);
    onChange(validate(evt.target.value));
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (onSave && evt.keyCode === 13) onSave();
  };

  const decimalPlaces = countDecimalPlaces(inputValue);
  const step = decimalPlaces == 0 ? "1.0" : `0.${'0'.repeat(decimalPlaces - 1)}1`;

  return (
    <input
      id={id}
      className={clsx(
        'rounded border border-gray-200 bg-gray-100 px-3 py-1 transition focus:border-primary-500 focus:ring-primary-500',
        'dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200',
        !valid && 'border-red-500 focus:border-red-500 focus:ring-red-500',
      )}
      ref={inputRef}
      type={showArrows ? 'number' : 'text'}
      size={15}
      value={inputValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      readOnly={readOnly}
      step={showArrows ? step : undefined}
    />
  );
};

export default TextInput;
