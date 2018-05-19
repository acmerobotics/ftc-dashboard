export const RECEIVE_CONFIG_SCHEMA = 'RECEIVE_CONFIG_SCHEMA';

export const receiveConfigSchema = (configSchema) => ({
  type: RECEIVE_CONFIG_SCHEMA,
  data: configSchema
});
