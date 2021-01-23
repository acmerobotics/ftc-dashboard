import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../store/reducers';
import { STOP_OP_MODE_TAG } from '../store/types/opmode';
import { OpModeStatus } from '../enums/OpModeStatus';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';

type LoggingViewProps = BaseViewProps & BaseViewHeadingProps;

type TelemetryStoreItem = {
  timestamp: number;
  data: {
    [key: string]: unknown;
    value: unknown;
  };
};

const LoggingView = ({
  isDraggable = false,
  isUnlocked = false,
}: LoggingViewProps) => {
  const { activeOpMode, activeOpModeStatus, opModeList } = useSelector(
    (state: RootState) => state.status,
  );

  const telemetry = useSelector((state: RootState) => state.telemetry);

  const [telemetryStore, setTelemetryStore] = useState<TelemetryStoreItem[]>(
    [],
  );
  const [keyStore, setKeyStore] = useState<string[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [currentOpModeName, setCurrentOpModeName] = useState('');

  const clearPastTelemetry = () => {
    setKeyStore([]);
    setTelemetryStore([]);
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
    const newKeys: string[] = [];

    telemetry?.forEach((e) => {
      for (const [key, value] of Object.entries(e.data)) {
        if (!keyStore.includes(key) && !newKeys.includes(key)) {
          newKeys.push(key);
        }
      }
    });

    if (newKeys.length !== 0) {
      setKeyStore([...keyStore, ...newKeys]);
    }

    // We only want this effect to run on telemetry change or else we are unable to tell
    // when new telemetry comes in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry]);

  return (
    <BaseView isUnlocked={isUnlocked}>
      <BaseViewHeading isDraggable={isDraggable}>Logging</BaseViewHeading>
      <BaseViewBody>
        {keyStore.map((e) => (
          <p key={e}>{e}</p>
        ))}
        <p>{isRecording.toString()}</p>
      </BaseViewBody>
    </BaseView>
  );
};

export default LoggingView;
