type ValResult<T> =
  | {
      value: T;
      valid: true;
    }
  | {
      value: string;
      valid: false;
    };

export function validateDouble(value: string): ValResult<number> {
  // TODO: fix this validation - seems like neither isFinite nor parseFloat is enough in isolation
  // https://camchenry.com/blog/parsefloat-vs-number
  if (isFinite(Number(value)) && value !== '') {
    return {
      value: parseFloat(value),
      valid: true,
    };
  } else {
    return {
      value,
      valid: false,
    };
  }
}

export function validateInt(value: string): ValResult<number> {
  if (/^-?\d+$/.test(value)) {
    return {
      value: parseInt(value, 10),
      valid: true,
    };
  } else {
    return {
      value,
      valid: false,
    };
  }
}

export function validateString(value: string): ValResult<string> {
  return {
    value,
    valid: true,
  };
}
