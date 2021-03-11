import { useState, useEffect, useReducer } from 'react';
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

  const clearPastTelemetry = () => {
    dispatchTelemetryStore({
      type: TelemetryStoreCommand.SET,
      payload: { store: [], keys: [], raw: [] },
    });
  };

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
    telemetry.forEach((e) => {
      dispatchTelemetryStore({
        type: TelemetryStoreCommand.APPEND,
        payload: e,
      });
    });
  }, [telemetry]);

  return (
    <BaseView isUnlocked={isUnlocked}>
      <BaseViewHeading isDraggable={isDraggable}>Logging</BaseViewHeading>
      <BaseViewBody>
        <CustomVirtualGrid
          header={['time', ...telemetryStore.keys]}
          data={telemetryStore.raw}
        />
      </BaseViewBody>
    </BaseView>
  );
};

export default LoggingView;
