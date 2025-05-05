import { useSelector } from 'react-redux';

import CustomVariable from '../ConfigView/CustomVariable';
import BaseView, {
  BaseViewProps,
  BaseViewHeadingProps,
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
} from '@/components/views/BaseView';

import { ReactComponent as SaveIcon } from '@/assets/icons/save.svg';
import { ReactComponent as RefreshIcon } from '@/assets/icons/refresh.svg';

import { RootState, useAppDispatch } from '@/store/reducers';
import {
  HardwareVar,
  HardwareVarState,
  CustomVarState,
} from '@/store/types/hardware';
import { useEffect } from 'react';

function validAndModified(state: HardwareVarState): HardwareVar | null {
  if (state.__type === 'custom') {
    const value = state.__value;
    if (value === null) {
      return null;
    } else {
      const filteredValue = Object.keys(value).reduce((acc, key) => {
        const child = validAndModified(value[key]);
        if (child === null) {
          return acc;
        }

        return {
          ...acc,
          [key]: child,
        };
      }, {});

      if (Object.keys(filteredValue).length === 0) {
        return null;
      }

      return {
        __type: 'custom',
        __value: filteredValue,
      };
    }
  } else {
    // TODO: keep in sync with the corresponding check in BasicVariable
    if (!state.__valid || state.__value === state.__newValue) {
      return null;
    }

    if (state.__type === 'enum') {
      return {
        __type: state.__type,
        __value: state.__newValue,
        __enumClass: state.__enumClass,
        __enumValues: state.__enumValues,
      };
    } else {
      return {
        __type: state.__type,
        __value: state.__newValue,
      };
    }
  }
}

type HardwareViewProps = BaseViewProps & BaseViewHeadingProps;

const HardwareView = ({
  id,
  isDraggable = false,
  isUnlocked = false,
}: HardwareViewProps) => {
  const dispatch = useAppDispatch();

  const hardwareRoot = useSelector(
    (state: RootState) => state.hardware.hardwareRoot,
  ) as CustomVarState;

  console.log('hardwareRoot:', hardwareRoot);

  const rootValue = hardwareRoot.__value;
  if (rootValue === null) {
    return null;
  }

  const sortedKeys = Object.keys(rootValue);
  sortedKeys.sort();

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>Hardware</BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton
            title="Save Changes"
            onClick={() => {
              const hardwareDiff = validAndModified(hardwareRoot);
              if (hardwareDiff != null) {
                dispatch({
                  type: 'SAVE_HARDWARE',
                  hardwareDiff,
                });
              }
            }}
          >
            <SaveIcon className="h-6 w-6" />
          </BaseViewIconButton>
          <BaseViewIconButton
            title="Reload Values"
            onClick={() =>
              dispatch({
                type: 'REFRESH_HARDWARE',
              })
            }
          >
            <RefreshIcon className="h-6 w-6" />
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      <BaseViewBody>
        <table className="block h-full">
          <tbody className="block">
            {sortedKeys.map((key) => (
              <CustomVariable
                key={key}
                name={key}
                path={id ? `${id}.${key}` : key}
                // invariant 2: children of the root are custom
                state={rootValue[key] as CustomVarState}
                onChange={(newState) =>
                  dispatch({
                    type: 'UPDATE_HARDWARE',
                    hardwareRoot: {
                      __type: 'custom',
                      __value: sortedKeys.reduce(
                        (acc, key2) => ({
                          ...acc,
                          [key2]: key === key2 ? newState : rootValue[key2],
                        }),
                        {},
                      ),
                    },
                  })
                }
                onSave={(variable) =>
                  dispatch({
                    type: 'SAVE_HARDWARE',
                    hardwareDiff: {
                      __type: 'custom',
                      __value: {
                        [key]: variable,
                      },
                    },
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </BaseViewBody>
    </BaseView>
  );
};

export default HardwareView;
