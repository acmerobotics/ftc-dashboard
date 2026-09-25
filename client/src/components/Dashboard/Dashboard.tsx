import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import clsx from 'clsx';

import LayoutPreset, { LayoutPresetType } from '@/enums/LayoutPreset';
import { saveLayoutPreset, getLayoutPreset } from '@/store/actions/settings';
import { exitPlayback, setPlaybackError } from '@/store/actions/playback';
import { formatClock } from '@/store/recording/timeFormat';
import { RootState } from '@/store/reducers';

import { BaseViewIconButton } from '@/components/views/BaseView';
import { ReactComponent as ConnectedIcon } from '@/assets/icons/connected.svg';
import { ReactComponent as DisconnectedIcon } from '@/assets/icons/disconnected.svg';
import { ReactComponent as SettingsIcon } from '@/assets/icons/settings.svg';
import SettingsModal from './SettingsModal';
import { startSocketWatcher } from '@/store/middleware/socketMiddleware';
import ReplayBadge from '@/components/views/ReplayBadge';

export default function Dashboard() {
  const socket = useSelector((state: RootState) => state.socket);
  const layoutPreset = useSelector(
    (state: RootState) => state.settings.layoutPreset,
  );
  const enabled = useSelector((state: RootState) => state.status.enabled);
  const batteryVoltage = useSelector(
    (state: RootState) => state.status.batteryVoltage,
  );
  const isReplaying = useSelector(
    (state: RootState) => state.playback.mode === 'playback',
  );
  // Compare mode needs its own global affordance. The dashboard is genuinely
  // live, so the amber bar would be a lie, but a recording is still drawn over
  // two panels and the Recorder tile may not be in the layout to close it from.
  const isComparing = useSelector(
    (state: RootState) => state.playback.mode === 'ghost',
  );
  const replayName = useSelector(
    (state: RootState) => state.playback.meta?.name ?? '',
  );
  const overlayCount = useSelector(
    (state: RootState) => state.playback.overlays.length,
  );
  const replayCursorMs = useSelector(
    (state: RootState) => state.playback.cursorMs,
  );
  const replayDurationMs = useSelector(
    (state: RootState) => state.playback.durationMs,
  );
  // Surfaced here because RecorderView is the only other reader and no fixed
  // layout preset contains one, so otherwise this is silent.
  const playbackError = useSelector((state: RootState) => state.playback.error);
  const dispatch = useDispatch();

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(getLayoutPreset());

    startSocketWatcher(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (!isReplaying) return;

    const previous = document.title;
    document.title = `Reviewing ${replayName || 'a recording'} | FTC Dashboard`;
    return () => {
      document.title = previous;
    };
  }, [isReplaying, replayName]);

  return (
    <div
      className="flex flex-col text-black dark:text-white"
      style={{ width: '100vw', height: '100vh' }}
    >
      {playbackError && (
        <div
          className="flex items-center justify-between gap-3 bg-amber-700 px-3 py-1 text-sm text-white"
          role="alert"
        >
          <span>{playbackError}</span>
          <button
            className="shrink-0 rounded border border-white/50 px-2 py-0.5 text-xs transition hover:bg-white/20"
            onClick={() => dispatch(setPlaybackError(null))}
          >
            Dismiss
          </button>
        </div>
      )}
      <header
        className={clsx(
          'flex items-center justify-between px-3 py-1 text-white',
          // Amber, not primary: four views showing convincing historical data
          // next to a live field is the worst failure this feature can produce.
          // amber-700, not amber-600: the header's text is white, and white on
          // amber-600 is 3.19:1. This keeps the amber warning colour and takes
          // it to 4.9:1.
          isReplaying ? 'bg-amber-700' : 'bg-primary-600',
        )}
      >
        <h1 className="shrink-0 text-2xl font-medium">FTC Dashboard</h1>
        <div className="flex-center min-w-0">
          <select
            className="mx-2 shrink-0 rounded border-primary-300 bg-primary-100 py-1 text-sm text-black focus:border-primary-100 focus:ring-2 focus:ring-white focus:ring-opacity-40"
            value={layoutPreset as LayoutPresetType}
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
          {(isReplaying || isComparing) && (
            <>
              <p className="mx-2 hidden min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm font-medium md:flex">
                <ReplayBadge
                  source={isReplaying ? 'replacing' : 'alongside'}
                  count={1 + overlayCount}
                  onHeader
                />
                <span className="min-w-0 truncate" title={replayName}>
                  {isReplaying ? 'Reviewing' : 'Comparing'}{' '}
                  {replayName || 'a recording'}
                  {isComparing &&
                    overlayCount > 0 &&
                    ` and ${overlayCount} more`}
                </span>
                {isReplaying && (
                  <span className="hidden shrink-0 lg:inline">
                    · {formatClock(replayCursorMs)} of{' '}
                    {formatClock(replayDurationMs)}
                  </span>
                )}
              </p>
              <button
                className="shrink-0 rounded border border-white/40 px-2 py-0.5 text-sm transition hover:bg-white/20"
                aria-label="Close recording"
                onClick={() => dispatch(exitPlayback())}
              >
                Close<span className="hidden lg:inline"> recording</span>
              </button>
            </>
          )}
          {/* The robot is still live while reviewing, and between runs the
              battery is what a team looks at. */}
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
