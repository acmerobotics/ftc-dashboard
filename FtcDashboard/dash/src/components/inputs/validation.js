// TODO: extract patterns into constants?

export const validateDouble = (value) => {
  if (!isNaN(Number(value))) {
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
};

export const validateInt = (value) => {
  if (value === '-' || value === '') {
    return {
      value: value,
      valid: false,
    };
  } else if (/^-?\d*$/.test(value)) {
    return {
      value: parseInt(value, 10),
      valid: true,
    };
  }
};

export const validateString = (value) => {
  return {
    value: value,
    valid: true,
  };
};
