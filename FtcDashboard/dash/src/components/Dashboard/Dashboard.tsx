import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import LayoutPreset, { LayoutPresetType } from '@/enums/LayoutPreset';
import { connect, disconnect } from '@/store/actions/socket';
import { saveLayoutPreset, getLayoutPreset } from '@/store/actions/settings';
import { RootState } from '@/store/reducers';

import { ReactComponent as ConnectedIcon } from '@/assets/icons/wifi.svg';
import { ReactComponent as DisconnectedIcon } from '@/assets/icons/wifi_off.svg';
import { ReactComponent as DeveloperModeIcon } from '@/assets/icons/developer_mode.svg';

import useDelayedTooltip from '@/hooks/useDelayedTooltip';
import ToolTip from '../ToolTip';

import DeveloperModeDialog from './DeveloperModeDialog';

export default function Dashboard() {
  const dispatch = useDispatch();
  const isConnected = useSelector(
    (state: RootState) => state.socket.isConnected,
  );
  const pingTime = useSelector((state: RootState) => state.socket.pingTime);
  const layoutPreset = useSelector(
    (state: RootState) => state.settings.layoutPreset,
  );

  const devModeBtnRef = useRef(null);
  const isShowingDownloadTooltip = useDelayedTooltip(0.5, devModeBtnRef);
  const [isDevDialogOpen, setIsDevDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(connect());
    dispatch(getLayoutPreset());

    return () => {
      dispatch(disconnect());
    };
  }, []);

  return (
    <div className="flex flex-col" style={{ width: '100vw', height: '100vh' }}>
      <header className="flex items-center justify-between px-3 py-2 text-white bg-blue-600">
        <h1 className="text-2xl font-medium">FTC Dashboard</h1>
        <div className="flex-center">
          <select
            className="py-1 mx-2 text-sm text-black bg-blue-100 border-blue-300 rounded focus:border-blue-100 focus:ring-2 focus:ring-white focus:ring-opacity-40"
            value={layoutPreset.toString()}
            onChange={(evt) =>
              dispatch(saveLayoutPreset(evt.target.value as LayoutPresetType))
            }
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
          </select>
          {isConnected && (
            <p
              className="mx-2"
              style={{
                width: '60px',
                textAlign: 'right',
              }}
            >
              {pingTime}ms
            </p>
          )}
          {isConnected ? (
            <ConnectedIcon className="w-8 h-8 py-0.5 ml-4" />
          ) : (
            <DisconnectedIcon className="w-8 h-8 py-0.5 ml-4" />
          )}
          {import.meta.env.DEV && (
            <button
              className="relative w-8 h-8 ml-4 icon-btn focus:ring-blue-100/60 hover:border-blue-100"
              onClick={() => setIsDevDialogOpen(true)}
              ref={devModeBtnRef}
            >
              <DeveloperModeIcon viewBox="0 0 50 50" className="w-6 h-6" />
              <ToolTip
                hoverRef={devModeBtnRef}
                isShowing={isShowingDownloadTooltip}
                posAdjustment={{ y: '90px', x: '-40px' }}
              >
                Developer Mode
              </ToolTip>
            </button>
          )}
        </div>
      </header>
      {LayoutPreset.getContent(layoutPreset as LayoutPresetType)}
      <DeveloperModeDialog
        isOpen={isDevDialogOpen}
        onClose={() => setIsDevDialogOpen(false)}
      />
    </div>
  );
}
