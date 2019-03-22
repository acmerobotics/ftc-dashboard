import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import CustomVariable from './CustomVariable';
import Heading from '../components/Heading';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';
import { updateConfig, saveConfig, refreshConfig } from '../actions/config';
import VariableType from '../enums/VariableType';

const ConfigView = ({ configRoot, onRefresh, onSave, onChange }) => (
  <div>
    <Heading level={2} text="Configuration">
      <IconGroup>
        <Icon icon="save" size="small" onClick={() => onSave()} />
        <Icon icon="refresh" size="small" onClick={onRefresh} />
      </IconGroup>
    </Heading>
    <table>
      <tbody>
        {
          Object.keys(configRoot.__value || {}).map((key) => (
            <CustomVariable
              key={key}
              name={key}
              value={configRoot.__value[key].__value || {}}
              onChange={
                (newValue) => {
                  onChange({
                    __type: VariableType.CUSTOM,
                    __value: {
                      [key]: newValue
                    }
                  });
                }
              } 
              onSave={
                (newValue) => {
                  onSave({
                    __type: VariableType.CUSTOM,
                    __value: {
                      [key]: newValue
                    }
                  });
                }
              } />
          ))
        }
      </tbody>
    </table>
  </div>
);

ConfigView.propTypes = {
  configRoot: PropTypes.object.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

const mapStateToProps = ({ config }) => config;

const mapDispatchToProps = (dispatch) => ({
  onRefresh: () => {
    dispatch(refreshConfig());
  },
  onSave: (configDiff) => {
    dispatch(saveConfig(configDiff));
  },
  onChange: (configDiff) => {
    dispatch(updateConfig(configDiff));
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(ConfigView);
