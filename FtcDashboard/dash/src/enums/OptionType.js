const OptionType = {
  BOOLEAN: 'boolean',
  INT: 'int',
  DOUBLE: 'double',
  STRING: 'string',
  ENUM: 'enum',
  CUSTOM: 'custom'
};

export default Object.freeze({
  ...OptionType,

  getFromSchema: (schema) => {
    let type;
    if (typeof schema === 'object') {
      if ('type' in schema) {
        type = schema.type;
      } else {
        type = OptionType.CUSTOM;
      }
    } else {
      type = schema;
    }
    return type;
  }
});
