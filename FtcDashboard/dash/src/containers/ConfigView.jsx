import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import CustomVariable from './CustomVariable';
import BaseView, { BaseViewHeading, BaseViewBody } from './BaseView';
import { ReactComponent as SaveSVG } from '../assets/icons/save.svg';
import { ReactComponent as RefreshSVG } from '../assets/icons/refresh.svg';

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
  isUnlocked,
}) => {
  const sortedKeys = Object.keys(configRoot.__value || {});

  sortedKeys.sort();

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex-center">
        <BaseViewHeading isDraggable={isDraggable}>
          Configuration
        </BaseViewHeading>
        <div className="flex items-center mr-3 space-x-1">
          <button className="icon-btn w-8 h-8">
            <SaveSVG
              className="w-6 h-6"
              onClick={() => onSave(getModifiedDiff(configRoot))}
            />
          </button>
          <button className="icon-btn w-8 h-8">
            <RefreshSVG className="w-6 h-6" onClick={onRefresh} />
          </button>
        </div>
      </div>
      <BaseViewBody>
        <table className="block h-full">
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
      </BaseViewBody>
    </BaseView>
  );
};

ConfigView.propTypes = {
  configRoot: PropTypes.object.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,

  isDraggable: PropTypes.bool,
  isUnlocked: PropTypes.bool,
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
