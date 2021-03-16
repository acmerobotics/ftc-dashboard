import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import CustomVariable from './CustomVariable';
import BaseView, {
  BaseViewProps,
  BaseViewHeadingProps,
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
import { RootState } from '../store/reducers';
import { Config, ConfigCustom } from '../store/types';

type ConfigViewProps = BaseViewProps & BaseViewHeadingProps;

const ConfigView = ({
  isDraggable = false,
  isUnlocked = false,
}: ConfigViewProps) => {
  const dispatch = useDispatch();
  const configRoot = useSelector((state: RootState) => state.config.configRoot);

  const onRefresh = () => dispatch(refreshConfig());
  const onSave = (configDiff: Config) => dispatch(saveConfig(configDiff));
  const onChange = (configDiff: Config) => dispatch(updateConfig(configDiff));

  const sortedKeys = Object.keys(configRoot.__value || {});

  sortedKeys.sort();

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>
          Configuration
        </BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton
            onClick={() => onSave(getModifiedDiff(configRoot))}
          >
            <SaveIcon className="w-6 h-6" />
          </BaseViewIconButton>
          <BaseViewIconButton onClick={onRefresh}>
            <RefreshIcon className="w-6 h-6" />
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
                value={(configRoot as ConfigCustom).__value[key].__value || {}}
                onChange={(newValue: Config) => {
                  onChange({
                    __type: VariableType.CUSTOM,
                    __value: {
                      [key]: newValue,
                    },
                  } as ConfigCustom);
                }}
                onSave={(newValue: Config) => {
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

export default ConfigView;
