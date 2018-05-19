import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import CustomOption from './CustomOption';
import Heading from '../components/Heading';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';
import { getConfig, updateConfig, saveConfig } from '../actions/config';

const ConfigView = ({ config, configSchema, onRefresh, onSave, onChange }) => (
  <div>
    <Heading level={2} text="Configuration">
      <IconGroup>
        <Icon icon="save" size="small" onClick={onSave} />
        <Icon icon="refresh" size="small" onClick={onRefresh} />
      </IconGroup>
    </Heading>
    <table>
      <tbody>
        {
          Object.keys(configSchema).map((key) => (
            <CustomOption
              key={key}
              name={key}
              value={config[key] || {}}
              schema={configSchema[key]}
              onChange={
                (value) => onChange({
                  [key]: value
                })
              } />
          ))
        }
      </tbody>
    </table>
  </div>
);

ConfigView.propTypes = {
  config: PropTypes.object.isRequired,
  configSchema: PropTypes.object.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

const mapStateToProps = ({ config, configSchema }) => ({
  config,
  configSchema
});

const mapDispatchToProps = (dispatch) => ({
  onRefresh: () => {
    dispatch(getConfig());
  },
  onSave: () => {
    dispatch(saveConfig());
  },
  onChange: (value) => {
    dispatch(updateConfig(value));
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(ConfigView);
