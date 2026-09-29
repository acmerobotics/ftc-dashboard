import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import LayoutPreset, { LayoutPresetType } from '@/enums/LayoutPreset';
import {
  saveLayoutPreset,
  getLayoutPreset,
  getSavedLayouts,
  loadSavedLayout,
  receiveLayoutPreset,
} from '@/store/actions/settings';
import { RootState } from '@/store/reducers';
import { SAVED_LAYOUTS_KEY } from '@/store/middleware/storageMiddleware';

import { BaseViewIconButton } from '@/components/views/BaseView';
import { readLayoutCodeFromUrl } from '@/components/ConfigurableLayout/layoutCode';
import { ReactComponent as ConnectedIcon } from '@/assets/icons/connected.svg';
import { ReactComponent as DisconnectedIcon } from '@/assets/icons/disconnected.svg';
import { ReactComponent as SettingsIcon } from '@/assets/icons/settings.svg';
import SettingsModal from './SettingsModal';
import { startSocketWatcher } from '@/store/middleware/socketMiddleware';

// Saved layouts share the preset list, so their option values are prefixed.
const SAVED_OPTION_PREFIX = 'saved:';

export default function Dashboard() {
  const socket = useSelector((state: RootState) => state.socket);
  const layoutPreset = useSelector(
    (state: RootState) => state.settings.layoutPreset,
  );
  const savedLayouts = useSelector(
    (state: RootState) => state.settings.savedLayouts,
  );
  const activeSavedLayout = useSelector(
    (state: RootState) => state.settings.activeSavedLayout,
  );
  const enabled = useSelector((state: RootState) => state.status.enabled);
  const batteryVoltage = useSelector(
    (state: RootState) => state.status.batteryVoltage,
  );
  const dispatch = useDispatch();

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(getLayoutPreset());

    startSocketWatcher(dispatch);
  }, [dispatch]);

  // Saved layouts written by another tab show up here without a reload.
  useEffect(() => {
    dispatch(getSavedLayouts());

    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SAVED_LAYOUTS_KEY) {
        dispatch(getSavedLayouts(true));
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [dispatch]);

  // Layout links are handled by the custom layout, so show it. The choice
  // is only saved once the user applies the layout.
  useEffect(() => {
    const showCustomLayoutForLink = () => {
      if (readLayoutCodeFromUrl() !== null) {
        dispatch(receiveLayoutPreset(LayoutPreset.CONFIGURABLE));
      }
    };

    showCustomLayoutForLink();
    window.addEventListener('hashchange', showCustomLayoutForLink);

    return () => {
      window.removeEventListener('hashchange', showCustomLayoutForLink);
    };
  }, [dispatch]);

  return (
    <div
      className="flex flex-col text-black dark:text-white"
      style={{ width: '100vw', height: '100vh' }}
    >
      <header className="flex items-center justify-between bg-primary-600 px-3 py-1 text-white">
        <h1 className="text-2xl font-medium">FTC Dashboard</h1>
        <div className="flex min-w-0 items-center">
          <select
            className="mx-2 min-w-[6rem] max-w-[40vw] truncate rounded border-primary-300 bg-primary-100 py-1 text-sm text-black focus:border-primary-100 focus:ring-2 focus:ring-white focus:ring-opacity-40 sm:max-w-[16rem]"
            value={
              layoutPreset === LayoutPreset.CONFIGURABLE &&
              activeSavedLayout !== null
                ? SAVED_OPTION_PREFIX + activeSavedLayout.id
                : (layoutPreset as LayoutPresetType)
            }
            onChange={(evt) => {
              const value = evt.target.value;
              if (value.startsWith(SAVED_OPTION_PREFIX)) {
                dispatch(
                  loadSavedLayout(value.slice(SAVED_OPTION_PREFIX.length)),
                );
              } else {
                dispatch(saveLayoutPreset(value as LayoutPresetType));
              }
            }}
          >
            {Object.keys(LayoutPreset)
              .filter(
                (key) =>
                  typeof LayoutPreset[key as LayoutPresetType] === 'string',
              )
              .map((key) => (
                <option key={key} value={key}>
                  {LayoutPreset.getName(key as LayoutPresetType)}
                </option>
              ))}
            {savedLayouts.length > 0 && (
              <optgroup label="Saved layouts">
                {savedLayouts.map((layout) => (
                  <option
                    key={layout.id}
                    value={SAVED_OPTION_PREFIX + layout.id}
                  >
                    {layout.name}
                    {activeSavedLayout?.id === layout.id &&
                    activeSavedLayout.edited
                      ? ' (edited)'
                      : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {socket.isConnected && (
            <p
              className="mx-2 shrink-0"
              style={{
                width: batteryVoltage > 0 ? '120px' : '60px',
                textAlign: 'right',
              }}
            >
              {socket.pingTime}ms
              {batteryVoltage > 0 ? ` / ${batteryVoltage.toFixed(2)}V` : ''}
            </p>
          )}
          {socket.isConnected ? (
            <ConnectedIcon className="ml-4 h-10 w-10 shrink-0 py-1" />
          ) : (
            <DisconnectedIcon className="ml-4 h-10 w-10 shrink-0 py-1" />
          )}
          <BaseViewIconButton
            title="Settings"
            className="icon-btn group ml-3 h-8 w-8 shrink-0 hover:border-white/50"
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <SettingsIcon className="h-7 w-7 transition group-hover:rotate-[15deg] group-focus:rotate-[15deg]" />
          </BaseViewIconButton>
        </div>
      </header>
      {socket.isConnected && !enabled ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <div
            className="justify-self-center text-center"
            style={{ maxWidth: '600px' }}
          >
            <h1 className="text-xl font-medium">FTC Dashboard is Disabled</h1>
            <p>
              To re-enable, run the &quot;Enable/Disable Dashboard&quot; op mode
              or select &quot;Enable Dashboard&quot; from the RC menu
            </p>
          </div>
        </div>
      ) : (
        LayoutPreset.getContent(layoutPreset as LayoutPresetType)
      )}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      {/* Insert a headless-ui portal so the .set-theme-x styles apply to the headless ui dialogs. */}
      {/* They are rendered as siblings to the root by default, outside of our scope */}
      <div id="headlessui-portal-root">
        {/* Leave an empty div here. Otherwise, headless-ui will remove this container on dialog close */}
        <div />
      </div>
    </div>
  );
}
