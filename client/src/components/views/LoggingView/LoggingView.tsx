import {
  useState,
  useEffect,
  useReducer,
  useRef,
  FormEventHandler,
} from 'react';
import { useSelector } from 'react-redux';

import { Transition, Switch } from '@headlessui/react';

import { RootState } from '@/store/reducers';
import { TelemetryItem, STOP_OP_MODE_TAG } from '@/store/types';
import { OpModeStatus } from '@/enums/OpModeStatus';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from '@/components/views/BaseView';
import ReplayBadge from '@/components/views/ReplayBadge';
import ToolTip from '@/components/ToolTip';
import CustomVirtualGrid from './CustomVirtualGrid';
import { formatClockMs } from '@/store/recording/timeFormat';
import { DateToHHMMSS } from './DateFormatting';

import useDelayedTooltip from '@/hooks/useDelayedTooltip';
import useOnClickOutside from '@/hooks/useOnClickOutside';

import { ReactComponent as DownloadSVG } from '@/assets/icons/file_download.svg';
import { ReactComponent as DownloadOffSVG } from '@/assets/icons/file_download_off.svg';
import { ReactComponent as MoreVertSVG } from '@/assets/icons/more_vert.svg';

type LoggingViewProps = BaseViewProps & BaseViewHeadingProps;

export type TelemetryStoreItem = {
  timestamp: number;
  /** Offset inside the recording, on replayed rows only. See rowTime. */
  recordedMs?: number;
  data: unknown[];
  log: string[];
};

enum TelemetryStoreCommand {
  SET,
  APPEND,
  SET_KEY_SHOWING,
}

type TelemetryStoreState = {
  store: TelemetryStoreItem[];
  keys: string[];
  raw: unknown[];
  keysShowing: boolean[];
};

type TelemetryStoreAction =
  | { type: TelemetryStoreCommand.SET; payload: TelemetryStoreState }
  | { type: TelemetryStoreCommand.APPEND; payload: TelemetryItem }
  | {
      type: TelemetryStoreCommand.SET_KEY_SHOWING;
      payload: { index: number; value: boolean };
    };

/**
 * A replayed `timestamp` is a browser-epoch value scaled by playback speed, for
 * Graph.ts, so at 4x it reports the match as a quarter of its length.
 * `recordedMs` is the frame's true offset inside the recording.
 */
function rowTime(item: { timestamp: number; recordedMs?: number }): string {
  return item.recordedMs === undefined
    ? DateToHHMMSS(new Date(item.timestamp))
    : formatClockMs(item.recordedMs);
}

const PLAIN_NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/** RFC 4180 quoting, and a leading quote on anything a spreadsheet would run as
 *  a formula; a recording can come from anyone. Numbers are left as numbers. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let cell = String(value);
  if (/^[=+\-@\t\r]/.test(cell) && !PLAIN_NUMBER.test(cell)) cell = `'${cell}`;
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

const telemetryStoreReducer = (
  state: TelemetryStoreState,
  action: TelemetryStoreAction,
): TelemetryStoreState => {
  switch (action.type) {
    case TelemetryStoreCommand.SET: {
      return action.payload;
    }
    case TelemetryStoreCommand.APPEND: {
      const { store, keys, raw, keysShowing } = state;
      const { timestamp, data, log } = action.payload;
      const { recordedMs } = action.payload;

      const newTelemetryStoreItem: TelemetryStoreItem = {
        timestamp,
        recordedMs,
        log,
        data: new Array(keys.length).fill(null),
      };

      for (const [key, value] of Object.entries(data)) {
        if (!keys.includes(key)) {
          keys.push(key);
          keysShowing.push(true);
        }

        newTelemetryStoreItem.data[keys.indexOf(key)] = value;
      }

      store.push(newTelemetryStoreItem);
      raw.push([rowTime(newTelemetryStoreItem), ...newTelemetryStoreItem.data]);

      return {
        store,
        keys,
        raw,
        keysShowing,
      };
    }
    case TelemetryStoreCommand.SET_KEY_SHOWING: {
      const newKeysShowing = [...state.keysShowing];
      newKeysShowing[action.payload.index] = action.payload.value;

      return { ...state, keysShowing: newKeysShowing };
    }
  }
};

const MenuItemSwitch = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange:
    | ((checked: boolean) => void)
    | (FormEventHandler<HTMLButtonElement> & ((checked: boolean) => void));
  children: JSX.Element | string;
}) => (
  <Switch.Group as="div" className="flex items-center space-x-4 px-3 py-1">
    <Switch
      as="button"
      checked={checked}
      onChange={onChange}
      className={`${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      } focus:shadow-outline relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
    >
      {({ checked }) => (
        <span
          className={`${
            checked ? 'translate-x-3' : 'translate-x-0'
          } inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out`}
        />
      )}
    </Switch>
    <Switch.Label className="ml-2">{children}</Switch.Label>
  </Switch.Group>
);

const LoggingView = ({
  isDraggable = false,
  isUnlocked = false,
}: LoggingViewProps) => {
  const { activeOpMode, activeOpModeStatus, opModeInfoList } = useSelector(
    (state: RootState) => state.status,
  );

  const telemetry = useSelector((state: RootState) => state.telemetry);
  // Narrow selectors: state.playback gets a new identity on every cursor tick.
  const playbackMode = useSelector((state: RootState) => state.playback.mode);
  const isReplaying = useSelector(
    (state: RootState) => state.playback.isPlaying,
  );
  const foldToken = useSelector((state: RootState) => state.playback.foldToken);
  const recording = useSelector((state: RootState) => state.playback.meta);

  const [telemetryStore, dispatchTelemetryStore] = useReducer(
    telemetryStoreReducer,
    {
      store: [],
      keys: [],
      raw: [],
      keysShowing: [],
    },
  );

  const [isRecording, setIsRecording] = useState(false);
  const [currentOpModeName, setCurrentOpModeName] = useState('');

  const [isDownloadable, setIsDownloadable] = useState(false);

  const [isKeyShowingMenuVisible, setIsKeyShowingMenuVisible] = useState(false);
  const [isTimeShowing, setIsTimeShowing] = useState(true);

  const downloadButtonRef = useRef(null);
  const isShowingDownloadTooltip = useDelayedTooltip(0.5, downloadButtonRef);

  const keyShowingMenuRef = useRef(null);
  const keyShowingMenuButtonRef = useRef(null);

  useOnClickOutside(
    keyShowingMenuRef,
    () => {
      if (isKeyShowingMenuVisible) setIsKeyShowingMenuVisible(false);
    },
    [keyShowingMenuButtonRef],
  );

  // Before the capture effect below, which must see a restored capture's state.
  const liveCapture = useRef<{
    state: TelemetryStoreState;
    recording: boolean;
  } | null>(null);
  const restoredRecording = useRef<boolean | null>(null);
  const seen = useRef({ playbackMode, foldToken });
  useEffect(() => {
    const prev = seen.current;
    seen.current = { playbackMode, foldToken };
    const entering =
      playbackMode === 'playback' && prev.playbackMode !== 'playback';
    const leaving =
      prev.playbackMode === 'playback' && playbackMode !== 'playback';

    // A replay takes over the rows, and the live ones may not be saved yet.
    if (entering) {
      liveCapture.current = { state: telemetryStore, recording: isRecording };
    }
    if (leaving && liveCapture.current) {
      const saved = liveCapture.current;
      liveCapture.current = null;
      restoredRecording.current = saved.recording;
      setIsRecording(saved.recording);
      dispatchTelemetryStore({
        type: TelemetryStoreCommand.SET,
        payload: saved.state,
      });
      return;
    }

    // foldToken, not clearToken: the playhead moved, so the rows no longer
    // describe what is shown and a backwards seek would re-append them.
    if (entering || leaving || foldToken !== prev.foldToken) {
      clearPastTelemetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackMode, foldToken]);

  useEffect(() => {
    // Replay drives this view through the same telemetry slice, but the robot's
    // status stays live, and opModeInfoList is empty whenever the dashboard
    // is disconnected. Without this branch, capturing (and therefore the CSV
    // download) would never start while reviewing a recording offline.
    if (playbackMode === 'playback') {
      // Purely the capture/download gate; clearing is keyed off the epoch
      // above, so pausing to read a row does not discard what was captured.
      setIsRecording(isReplaying);
      const saved = liveCapture.current;
      if (
        saved?.recording &&
        (opModeInfoList?.length === 0 ||
          activeOpMode === STOP_OP_MODE_TAG ||
          activeOpModeStatus === OpModeStatus.STOPPED)
      ) {
        saved.recording = false;
      }
      return;
    }

    const capturing = restoredRecording.current ?? isRecording;
    restoredRecording.current = null;
    if (opModeInfoList?.length === 0) {
      setIsRecording(false);
    } else if (activeOpMode === STOP_OP_MODE_TAG) {
      setIsRecording(false);
    } else if (
      (activeOpModeStatus === OpModeStatus.RUNNING || telemetry.length > 1) &&
      !capturing
    ) {
      setIsRecording(true);
      clearPastTelemetry();
    } else if (activeOpModeStatus === OpModeStatus.STOPPED) {
      setIsRecording(false);
    }
  }, [
    activeOpMode,
    activeOpModeStatus,
    isRecording,
    isReplaying,
    opModeInfoList,
    playbackMode,
    telemetry,
  ]);

  useEffect(() => {
    if (
      activeOpModeStatus === OpModeStatus.RUNNING &&
      activeOpMode !== STOP_OP_MODE_TAG
    ) {
      setCurrentOpModeName(activeOpMode ?? '');
    }
  }, [activeOpMode, activeOpModeStatus]);

  useEffect(() => {
    if (!isRecording && telemetryStore.store.length !== 0) {
      setIsDownloadable(true);
    } else {
      setIsDownloadable(false);
    }
  }, [isRecording, telemetryStore.store.length]);

  useEffect(() => {
    if (telemetry.length === 1 && telemetry[0].timestamp === 0) return;

    // An empty batch is never a reason to discard the capture, replayed or not.
    // Live it is an ordinary message (telemetry.clear(), op-mode pre-init) that
    // this panel has always ignored, and the rows belong to the user.
    if (telemetry.length === 0) return;

    telemetry.forEach((e) => {
      if (e.seed) return;
      dispatchTelemetryStore({
        type: TelemetryStoreCommand.APPEND,
        payload: e,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry]);

  const clearPastTelemetry = () => {
    dispatchTelemetryStore({
      type: TelemetryStoreCommand.SET,
      payload: { store: [], keys: [], raw: [], keysShowing: [] },
    });
  };

  const downloadCSV = () => {
    if (!isDownloadable) return;

    function downloadBlob(data: string, fileName: string, mime: string) {
      const a = document.createElement('a');
      a.style.display = 'none';
      document.body.appendChild(a);

      const blob = new Blob([data], { type: mime });
      const url = window.URL.createObjectURL(blob);

      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }

    const storeCopy = [...telemetryStore.store];
    storeCopy.sort((a, b) => a.timestamp - b.timestamp);

    const firstRow = ['time', ...telemetryStore.keys, 'logs'];
    const body = storeCopy.map((e) => [
      rowTime(e),
      ...e.data,
      ...new Array(telemetryStore.keys.length - e.data.length),
      e.log.join('\n'),
    ]);
    const csv = [firstRow, ...body]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');

    // A replayed row's timestamp is replay wall time, and the op mode running
    // live has nothing to do with the rows.
    const { recordedMs } = storeCopy[0];
    const fromRecording = recordedMs !== undefined && recording !== null;
    const fileDate = new Date(
      fromRecording ? recording.createdAt + recordedMs : storeCopy[0].timestamp,
    );
    const fileOpMode = fromRecording
      ? recording.opMode || recording.name
      : currentOpModeName;
    const year = fileDate.getFullYear();
    const month = `0${fileDate.getMonth()}`.slice(-2);
    const date = `0${fileDate.getDay()}`.slice(-2);

    const hourlyDate = DateToHHMMSS(fileDate)
      .replaceAll(':', '_')
      .split('.')[0];

    downloadBlob(
      csv,
      `${fileOpMode} ${year}-${month}-${date} ${hourlyDate}.csv`,
      'text/csv',
    );
  };

  const getToolTipError = () => {
    if (
      telemetryStore.store.length === 0 &&
      activeOpModeStatus !== OpModeStatus.RUNNING
    ) {
      return 'No logs to download';
    } else if (
      activeOpModeStatus === OpModeStatus.RUNNING &&
      activeOpMode !== STOP_OP_MODE_TAG
    ) {
      return 'Cannot download logs while OpMode is running';
    }

    return `Download logs for ${
      playbackMode === 'playback' && recording
        ? recording.opMode || recording.name
        : currentOpModeName
    }`;
  };

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex-center">
        <BaseViewHeading isDraggable={isDraggable}>
          Logging
          {playbackMode === 'playback' && <ReplayBadge source="replacing" />}
        </BaseViewHeading>
        <div className="mr-3 flex items-center space-x-1">
          <button
            className={`icon-btn h-8 w-8 ${
              isDownloadable ? '' : 'border-gray-400'
            }`}
            onClick={downloadCSV}
            ref={downloadButtonRef}
          >
            {isDownloadable ? (
              <DownloadSVG className="h-6 w-6" />
            ) : (
              <DownloadOffSVG className="text-neutral-gray-400 h-6 w-6" />
            )}
            <ToolTip
              hoverRef={downloadButtonRef}
              isShowing={isShowingDownloadTooltip}
            >
              {getToolTipError()}
            </ToolTip>
          </button>
          <div className="relative inline-block" style={{ zIndex: 99 }}>
            <button
              ref={keyShowingMenuButtonRef}
              className="icon-btn h-8 w-8"
              onClick={() =>
                setIsKeyShowingMenuVisible(!isKeyShowingMenuVisible)
              }
            >
              <MoreVertSVG className="h-6 w-6" />
            </button>
            <Transition
              show={isKeyShowingMenuVisible}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <div
                ref={keyShowingMenuRef}
                className="absolute right-0 mt-2 origin-top-right rounded-md border border-gray-200 bg-white py-2 shadow-lg outline-none dark:bg-slate-700"
              >
                <p className="mb-1 border-b border-gray-100 pb-1 pl-3 text-sm leading-5">
                  Toggle Items
                </p>
                <MenuItemSwitch
                  checked={isTimeShowing}
                  onChange={setIsTimeShowing}
                >
                  Time
                </MenuItemSwitch>
                {[...telemetryStore.keys].map((e, i) => (
                  <MenuItemSwitch
                    key={e}
                    checked={telemetryStore.keysShowing[i]}
                    onChange={() =>
                      dispatchTelemetryStore({
                        type: TelemetryStoreCommand.SET_KEY_SHOWING,
                        payload: {
                          index: i,
                          value: !telemetryStore.keysShowing[i],
                        },
                      })
                    }
                  >
                    {e}
                  </MenuItemSwitch>
                ))}
              </div>
            </Transition>
          </div>
        </div>
      </div>
      <BaseViewBody>
        <CustomVirtualGrid
          header={
            telemetryStore.keys.length !== 0
              ? ['Time', ...telemetryStore.keys]
              : []
          }
          data={telemetryStore.raw}
          columnsShowing={[isTimeShowing, ...telemetryStore.keysShowing]}
        />
      </BaseViewBody>
    </BaseView>
  );
};

export default LoggingView;
