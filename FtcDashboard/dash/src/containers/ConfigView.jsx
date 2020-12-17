import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import CustomVariable from './CustomVariable';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';

import {
  updateConfig,
  saveConfig,
  refreshConfig,
  getModifiedDiff,
} from '../actions/config';
import VariableType from '../enums/VariableType';
import LayoutPreset from '../enums/LayoutPreset';

const ConfigView = ({
  configRoot,
  onRefresh,
  onSave,
  onChange,
  layoutPreset,
}) => {
  const sortedKeys = Object.keys(configRoot.__value || {});

  sortedKeys.sort();

  return (
    <div
      style={{
        height: 'calc(100% - 3em)',
        padding: '1em',
        paddingTop: '0.5em',
      }}
    >
      <div className="flex justify-between items-center">
        <h2
          className={`${
            layoutPreset == LayoutPreset.CONFIGURABLE ? 'grab-handle' : ''
          } text-xl w-full py-2 font-bold`}
        >
          Configuration
        </h2>
        <IconGroup>
          <Icon
            icon="save"
            size="small"
            onClick={() => onSave(getModifiedDiff(configRoot))}
          />
          <Icon icon="refresh" size="small" onClick={onRefresh} />
        </IconGroup>
      </div>
      <table style={{ height: '100%', display: 'block', overflow: 'scroll' }}>
        <tbody>
          {sortedKeys.map((key) => (
            <CustomVariable
              key={key}
              name={key}
              value={configRoot.__value[key].__value || {}}
              onChange={(newValue) => {
                onChange({
                  __type: VariableType.CUSTOM,
                  __value: {
                    [key]: newValue,
                  },
                });
              }}
              onSave={(newValue) => {
                onSave({
                  __type: VariableType.CUSTOM,
                  __value: {
                    [key]: newValue,
                  },
                });
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

ConfigView.propTypes = {
  configRoot: PropTypes.object.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  // This should be
  // PropTypes.oneOf(Object.keys(LayoutPreset)).isRequired
  // but for some reason it breaks
  layoutPreset: PropTypes.any,
};

const mapStateToProps = ({ config, settings }) => ({
  configRoot: config,
  layoutPreset: settings.layoutPreset,
});

const mapDispatchToProps = (dispatch) => ({
  onRefresh: () => {
    dispatch(refreshConfig());
  },
  onSave: (configDiff) => {
    dispatch(saveConfig(configDiff));
  },
  onChange: (configDiff) => {
    dispatch(updateConfig(configDiff));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ConfigView);
