import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

import CustomVariable from './CustomVariable';
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
import { ReactComponent as FilterIcon } from '@/assets/icons/filter.svg';
import { ReactComponent as ClearPinsIcon } from '@/assets/icons/delete_sweep.svg';

import { RootState, useAppDispatch } from '@/store/reducers';
import { HARDWARE_CATEGORY } from '@/store/reducers/config';
import {
  ConfigVar,
  ConfigVarState,
  CustomVarState,
} from '@/store/types/config';

function validAndModified(state: ConfigVarState): ConfigVar | null {
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

const PINNED_STORAGE_KEY = 'pinnedConfigOpModes';
// The storage event only reaches other tabs, so instances sharing this document
// are notified directly.
const PINNED_CHANGE_EVENT = 'pinnedConfigOpModesChange';

function loadPinned(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(PINNED_STORAGE_KEY) ?? '[]');
    return Array.isArray(stored)
      ? stored.filter((k) => typeof k === 'string')
      : [];
  } catch {
    return [];
  }
}

function savePinned(keys: string[]): boolean {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(PINNED_CHANGE_EVENT));
  return true;
}

type ConfigViewProps = BaseViewProps & BaseViewHeadingProps;

const ConfigView = ({
  id,
  isDraggable = false,
  isUnlocked = false,
}: ConfigViewProps) => {
  const dispatch = useAppDispatch();

  const configRoot = useSelector(
    (state: RootState) => state.config.configRoot,
  ) as CustomVarState;

  const configBaseline = useSelector(
    (state: RootState) => state.config.configBaseline,
  );

  // Request baseline when component mounts
  useEffect(() => {
    if (!configBaseline) {
      dispatch({
        type: 'GET_CONFIG_BASELINE',
      });
    }
  }, [dispatch, configBaseline]);

  // State for filtering only baseline-modified variables
  const [showOnlyModified, setShowOnlyModified] = useState(false);

  // Pinned op mode categories, persisted per user across sessions
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(loadPinned);

  useEffect(() => {
    const syncPinned = () => setPinnedKeys(loadPinned());
    const onStorage = (evt: StorageEvent) => {
      if (evt.key === null || evt.key === PINNED_STORAGE_KEY) {
        syncPinned();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(PINNED_CHANGE_EVENT, syncPinned);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(PINNED_CHANGE_EVENT, syncPinned);
    };
  }, []);

  const togglePin = (key: string) => {
    const toggled = (keys: string[]) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];

    const next = toggled(loadPinned());
    if (savePinned(next)) {
      setPinnedKeys(next);
    } else {
      // A write that failed leaves storage stale, so the in-memory list is the
      // only one that reflects this session.
      setPinnedKeys(toggled);
    }
  };

  const clearAllPins = () => {
    savePinned([]);
    setPinnedKeys([]);
  };

  // Helper function to check if a configuration variable has baseline modifications
  const hasBaselineModifications = (
    varState: ConfigVarState,
    varBaseline: ConfigVar | null,
  ): boolean => {
    if (!varBaseline) return false;

    if (varState.__type === 'custom') {
      const value = varState.__value;
      if (!value || varBaseline.__type !== 'custom' || !varBaseline.__value) {
        return false;
      }

      // Check each child variable
      for (const key of Object.keys(value)) {
        const childState = value[key];
        const childBaseline =
          (typeof varBaseline.__value === 'object' &&
            !Array.isArray(varBaseline.__value) &&
            varBaseline.__value[key]) ||
          null;

        if (hasBaselineModifications(childState, childBaseline)) {
          return true;
        }
      }
      return false;
    } else {
      // For basic variables, check if current value differs from baseline
      return (
        varBaseline.__type !== 'custom' &&
        varBaseline.__value !== varState.__value
      );
    }
  };

  const rootValue = configRoot.__value;
  if (rootValue === null) {
    return null;
  }

  let sortedKeys = Object.keys(rootValue).filter(
    (key) => key !== HARDWARE_CATEGORY,
  );

  // Filter keys if showOnlyModified is enabled
  if (showOnlyModified) {
    sortedKeys = sortedKeys.filter((key) => {
      const childState = rootValue[key];
      const childBaseline =
        configBaseline?.__type === 'custom' &&
        configBaseline?.__value &&
        typeof configBaseline.__value === 'object' &&
        !Array.isArray(configBaseline.__value)
          ? configBaseline.__value[key] || null
          : null;
      return hasBaselineModifications(childState, childBaseline);
    });
  }

  // Pinned categories first (alphabetical among themselves), then the rest
  sortedKeys.sort((a, b) => {
    const aPinned = pinnedKeys.includes(a);
    const bPinned = pinnedKeys.includes(b);
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }
    return a.localeCompare(b);
  });

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>
          Configuration
        </BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton
            title="Clear all pinned op modes"
            onClick={clearAllPins}
            disabled={pinnedKeys.length === 0}
            style={{
              opacity: pinnedKeys.length === 0 ? 0.4 : undefined,
              cursor: pinnedKeys.length === 0 ? 'default' : undefined,
            }}
          >
            <ClearPinsIcon className="h-6 w-6" />
          </BaseViewIconButton>
          <BaseViewIconButton
            title={
              showOnlyModified
                ? 'Show all variables'
                : 'Show only modified variables'
            }
            onClick={() => setShowOnlyModified(!showOnlyModified)}
            style={{
              backgroundColor: showOnlyModified ? '#ff6b6b' : undefined,
              color: showOnlyModified ? 'white' : undefined,
            }}
          >
            <FilterIcon className="h-6 w-6" />
          </BaseViewIconButton>
          <BaseViewIconButton
            title="Save Changes"
            onClick={() => {
              const configDiff = validAndModified(configRoot);
              if (configDiff != null) {
                dispatch({
                  type: 'SAVE_CONFIG',
                  configDiff,
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
                type: 'REFRESH_CONFIG',
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
                baseline={
                  configBaseline?.__type === 'custom' &&
                  configBaseline?.__value &&
                  typeof configBaseline.__value === 'object' &&
                  !Array.isArray(configBaseline.__value)
                    ? configBaseline.__value[key] || null
                    : null
                }
                showOnlyModified={showOnlyModified}
                pinned={pinnedKeys.includes(key)}
                onTogglePin={() => togglePin(key)}
                onChange={(newState) =>
                  dispatch({
                    type: 'UPDATE_CONFIG',
                    configRoot: {
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
                    type: 'SAVE_CONFIG',
                    configDiff: {
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

export default ConfigView;
