import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import CustomOption from './CustomOption';
import Heading from '../components/Heading';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';
import { updateConfigOptions, saveConfigOptions } from '../actions/config';

const ConfigView = ({ config, onRefresh, onSave, onChange }) => (
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
          Object.keys(config.schema).map((key) => (
            <CustomOption
              key={key}
              name={key}
              value={config.options[key] || {}}
              modifiedValue={config.modifiedOptions ? config.modifiedOptions[key] : undefined}
              schema={config.schema[key]}
              onChange={
                (value) => {
                  onChange({
                    ...config.modifiedOptions,
                    [key]: value
                  });
                }
              } 
              onSave={
                (value) => {
                  onSave({
                    [key]: value
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
  config: PropTypes.shape({
    options: PropTypes.object.isRequired,
    modifiedOptions: PropTypes.object.isRequired,
    schema: PropTypes.object.isRequired
  }),
  onRefresh: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

const mapStateToProps = ({ config }) => ({
  config
});

const mapDispatchToProps = (dispatch) => ({
  onRefresh: () => {
    dispatch(updateConfigOptions({}));
  },
  onSave: (options) => {
    dispatch(saveConfigOptions(options));
  },
  onChange: (modifiedOptions) => {
    dispatch(updateConfigOptions(modifiedOptions));
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(ConfigView);
