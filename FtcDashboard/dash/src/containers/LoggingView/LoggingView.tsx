import { useState, useEffect, useReducer, useRef } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../store/reducers';
import { TelemetryItem, STOP_OP_MODE_TAG } from '../../store/types';
import { OpModeStatus } from '../../enums/OpModeStatus';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from '../BaseView';
import CustomVirtualGrid from './CustomVirtualGrid';
import { DateToHHMMSS } from './DateFormatting';
import useDelayedTooltip from '../../hooks/useDelayedTooltip';
import ToolTip from '../../components/ToolTip';

import { ReactComponent as DownloadSVG } from '../../assets/icons/file_download.svg';
import { ReactComponent as DownloadOffSVG } from '../../assets/icons/file_download_off.svg';

type LoggingViewProps = BaseViewProps & BaseViewHeadingProps;

export type TelemetryStoreItem = {
  timestamp: number;
  data: unknown[];
  log: string[];
};

enum TelemetryStoreCommand {
  SET,
  APPEND,
}

type TelemetryStoreState = {
  store: TelemetryStoreItem[];
  keys: string[];
  raw: unknown[];
};

type TelemetryStoreAction =
  | { type: TelemetryStoreCommand.SET; payload: TelemetryStoreState }
  | { type: TelemetryStoreCommand.APPEND; payload: TelemetryItem };

const telemetryStoreReducer = (
  state: TelemetryStoreState,
  action: TelemetryStoreAction,
): TelemetryStoreState => {
  switch (action.type) {
    case TelemetryStoreCommand.SET: {
      return action.payload;
    }
    case TelemetryStoreCommand.APPEND: {
      const { store, keys, raw } = state;
      const { timestamp, data, log } = action.payload;

      const newTelemetryStoreItem: TelemetryStoreItem = {
        timestamp,
        log,
        data: new Array(keys.length).fill(null),
      };

      for (const [key, value] of Object.entries(data)) {
        if (!keys.includes(key)) keys.push(key);

        newTelemetryStoreItem.data[keys.indexOf(key)] = value;
      }

      store.push(newTelemetryStoreItem);
      raw.push([
        DateToHHMMSS(new Date(timestamp)),
        ...newTelemetryStoreItem.data,
      ]);

      return {
        store,
        keys,
        raw,
      };
    }
  }
};

const LoggingView = ({
  isDraggable = false,
  isUnlocked = false,
}: LoggingViewProps) => {
  const { activeOpMode, activeOpModeStatus, opModeList } = useSelector(
    (state: RootState) => state.status,
  );

  const telemetry = useSelector((state: RootState) => state.telemetry);

  const [
    telemetryStore,
    dispatchTelemetryStore,
  ] = useReducer(telemetryStoreReducer, { store: [], keys: [], raw: [] });

  const [isRecording, setIsRecording] = useState(false);
  const [currentOpModeName, setCurrentOpModeName] = useState('');

  const [isDownloadable, setIsDownloadable] = useState(false);

  const downloadButtonRef = useRef(null);
  const isShowingDownloadTooltip = useDelayedTooltip(0.5, downloadButtonRef);

  useEffect(() => {
    if (opModeList?.length === 0) {
      setIsRecording(false);
    } else if (activeOpMode === STOP_OP_MODE_TAG) {
      setIsRecording(false);
    } else if (
      (activeOpModeStatus === OpModeStatus.RUNNING || telemetry.length > 1) &&
      !isRecording
    ) {
      setIsRecording(true);
      clearPastTelemetry();
    } else if (activeOpModeStatus === OpModeStatus.STOPPED) {
      setIsRecording(false);
    }
  }, [activeOpMode, activeOpModeStatus, isRecording, opModeList, telemetry]);

  useEffect(() => {
    if (activeOpModeStatus === OpModeStatus.RUNNING) {
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

    telemetry.forEach((e) => {
      dispatchTelemetryStore({
        type: TelemetryStoreCommand.APPEND,
        payload: e,
      });
    });
  }, [telemetry]);

  const clearPastTelemetry = () => {
    dispatchTelemetryStore({
      type: TelemetryStoreCommand.SET,
      payload: { store: [], keys: [], raw: [] },
    });
  };

  const downloadCSV = () => {
    if (!isDownloadable) return;

    console.log('bruh');

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
    const body = storeCopy
      .map(
        (e) =>
          `${DateToHHMMSS(new Date(e.timestamp))},${[
            ...e.data,
            ...new Array(telemetryStore.keys.length - e.data.length),
          ].join(',')},"${e.log.join('\n')}"`,
      )
      .join('\r\n');
    const csv = `${firstRow}\r\n${body}`;

    const fileDate = new Date(storeCopy[0].timestamp);
    const year = fileDate.getFullYear();
    const month = `0${fileDate.getMonth()}`.slice(-2);
    const date = `0${fileDate.getDay()}`.slice(-2);

    const hourlyDate = DateToHHMMSS(fileDate)
      .replaceAll(':', '_')
      .split('.')[0];

    downloadBlob(
      csv,
      `${currentOpModeName} ${year}-${month}-${date} ${hourlyDate}.csv`,
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

    return `Download logs for ${currentOpModeName}`;
  };

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex-center">
        <BaseViewHeading isDraggable={isDraggable}>Logging</BaseViewHeading>
        <div className="flex items-center mr-3 space-x-1">
          <button
            className={`icon-btn w-8 h-8 ${
              isDownloadable ? '' : 'border-gray-400'
            }`}
            onClick={downloadCSV}
            ref={downloadButtonRef}
          >
            {isDownloadable ? (
              <DownloadSVG className="w-6 h-6" />
            ) : (
              <DownloadOffSVG className="w-6 h-6 text-neutral-gray-400" />
            )}
            <ToolTip
              hoverRef={downloadButtonRef}
              isShowing={isShowingDownloadTooltip}
            >
              {getToolTipError()}
            </ToolTip>
          </button>
        </div>
      </div>
      <BaseViewBody>
        <CustomVirtualGrid
          header={
            telemetryStore.keys.length !== 0
              ? ['time', ...telemetryStore.keys]
              : []
          }
          data={telemetryStore.raw}
        />
      </BaseViewBody>
    </BaseView>
  );
};

export default LoggingView;
