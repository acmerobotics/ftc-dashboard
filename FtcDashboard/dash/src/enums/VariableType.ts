const VariableType = {
  BOOLEAN: 'boolean',
  INT: 'int',
  DOUBLE: 'double',
  STRING: 'string',
  ENUM: 'enum',
  CUSTOM: 'custom',
} as const;

export type VariableBasic = 'boolean' | 'int' | 'string' | 'enum';

export type VariableCustom = 'custom';

export type Variable = VariableBasic | VariableCustom;

export default VariableType;
