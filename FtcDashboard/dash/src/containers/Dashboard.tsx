import { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import LayoutPreset, { LayoutPresetType } from '../enums/LayoutPreset';
import { connect, disconnect } from '../store/actions/socket';
import { saveLayoutPreset, getLayoutPreset } from '../store/actions/settings';

import { ReactComponent as ConnectedIcon } from '../assets/icons/wifi.svg';
import { ReactComponent as DisconnectedIcon } from '../assets/icons/wifi_off.svg';
import { ReactComponent as DeveloperModeIcon } from '../assets/icons/developer_mode.svg';
import { RootState } from '../store/reducers';
import { Dialog, Switch, Transition } from '@headlessui/react';
import useDelayedTooltip from '../hooks/useDelayedTooltip';
import ToolTip from '../components/ToolTip';

const DeveloperModeDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [mockSocketEnabled, setMockSocketEnabled] = useState(false);

  return (
    <Transition as={Fragment} show={isOpen}>
      <Dialog onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md py-6 overflow-hidden text-left align-middle transition-all transform bg-white rounded-md shadow-xl">
                <Dialog.Title className="px-6 mb-4 text-xl font-medium">
                  Developer Options
                </Dialog.Title>
                <ul>
                  <li
                    className={`px-4 ${
                      !mockSocketEnabled ? 'bg-gray-100' : ''
                    }`}
                  >
                    <section className="px-2 border-t border-b border-gray-300">
                      <div className="flex flex-row items-center justify-between">
                        <h4 className="py-4 font-medium">Mock Socket</h4>
                        <Switch
                          checked={mockSocketEnabled}
                          onChange={setMockSocketEnabled}
                          className={`${
                            mockSocketEnabled
                              ? 'bg-blue-600 border-blue-700'
                              : 'bg-gray-300 border-gray-400'
                          } relative inline-flex h-6 w-11 items-center rounded-full border`}
                        >
                          <span
                            className={`${
                              mockSocketEnabled
                                ? 'translate-x-[1.35rem]'
                                : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                          />
                        </Switch>
                      </div>
                    </section>
                  </li>
                </ul>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

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
    dispatch(
      connect(
        import.meta.env['VITE_REACT_APP_HOST']?.toString() ??
          window.location.hostname,
        import.meta.env['VITE_REACT_APP_PORT']?.toString() ?? '8000',
      ),
    );

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
