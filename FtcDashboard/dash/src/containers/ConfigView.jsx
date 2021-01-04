import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import CustomVariable from './CustomVariable';
import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
} from './BaseView';

import { ReactComponent as SaveIcon } from '../assets/icons/save.svg';
import { ReactComponent as RefreshIcon } from '../assets/icons/refresh.svg';

import {
  updateConfig,
  saveConfig,
  refreshConfig,
  getModifiedDiff,
} from '../store/actions/config';
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
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>
          Configuration
        </BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton>
            <SaveIcon
              className="w-6 h-6"
              onClick={() => onSave(getModifiedDiff(configRoot))}
            />
          </BaseViewIconButton>
          <BaseViewIconButton>
            <RefreshIcon className="w-6 h-6" onClick={onRefresh} />
          </BaseViewIconButton>
        </BaseViewIcons>
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
