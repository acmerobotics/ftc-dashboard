import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import CustomVariable from './CustomVariable';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';
import BaseView from './BaseView';

import {
  updateConfig,
  saveConfig,
  refreshConfig,
  getModifiedDiff,
} from '../actions/config';
import VariableType from '../enums/VariableType';

const ConfigView = ({
  configRoot,
  onRefresh,
  onSave,
  onChange,
  isDraggable,
  showShadow,
}) => {
  const sortedKeys = Object.keys(configRoot.__value || {});

  sortedKeys.sort();

  return (
    <BaseView className="overflow-hidden pr-0 pb-0" showShadow={showShadow}>
      <div className="flex justify-between items-center">
        <h2
          className={`${
            isDraggable ? 'grab-handle' : ''
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
      <div>
        <table className="block h-full overflow-auto">
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
    </BaseView>
  );
};

ConfigView.propTypes = {
  configRoot: PropTypes.object.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,

  isDraggable: PropTypes.bool,
  showShadow: PropTypes.bool,
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
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ConfigView);
