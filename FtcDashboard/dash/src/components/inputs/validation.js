// TODO: extract patterns into constants?

export const validateDouble = (value) => {
  if (value === ''
      || /^-0?$/.test(value)
      || /^-?\d*\.([1-9]*0+)*$/.test(value)) {
    return {
      value: value,
      valid: false
    };
  } else if (/^-?\d*\.?\d*$/.test(value)) {
    return {
      value: parseFloat(value),
      valid: true
    };
  }
};

export const validateInt = (value) => {
  if (value === '-' || value === '') {
    return {
      value: value,
      valid: false
    };
  } else if (/^-?\d*$/.test(value)) {
    return {
      value: parseInt(value, 10),
      valid: true
    };
  }
};

export const validateString = (value) => {
  return {
    value: value,
    valid: true
  };
};