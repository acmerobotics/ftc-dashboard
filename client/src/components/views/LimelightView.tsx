import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/reducers';
import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
} from './BaseView';
import { ReactComponent as RefreshIcon } from '@/assets/icons/refresh.svg';

type LimelightStatus = {
  temp: number;
  cpu: number;
  ram: number;
  pipelineIndex: number;
};

function getLimelightHost(): string {
  return import.meta.env['VITE_REACT_APP_HOST'] || window.location.hostname;
}

type LimelightViewProps = {
  isDraggable?: boolean;
  isUnlocked?: boolean;
};

export default function LimelightView({
  isDraggable,
  isUnlocked,
}: LimelightViewProps) {
  const isConnected = useSelector(
    (state: RootState) => state.socket.isConnected,
  );
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<LimelightStatus | null>(null);
  const [showStream, setShowStream] = useState(true);
  const [streamKey, setStreamKey] = useState(0);

  const host = getLimelightHost();
  const streamUrl = `http://${host}:5800`;
  const dashboardUrl = `http://${host}:5801`;
  const statusUrl = `http://${host}:5807/status`;

  const checkStatus = useCallback(async () => {
    if (!isConnected) {
      setAvailable(false);
      setStatus(null);
      return;
    }
    let available = false;
    let data: LimelightStatus | null = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(statusUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) return;
      data = await resp.json();
      available = true;
    } finally {
      setAvailable(available);
      setStatus(data);
    }
  }, [isConnected, statusUrl]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>Limelight</BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton
            title="Refresh stream"
            onClick={() => setStreamKey((k) => k + 1)}
          >
            <RefreshIcon className="h-6 w-6" />
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      <BaseViewBody>
        {!isConnected ? (
          <p className="py-4 text-center text-gray-500">
            Not connected to robot
          </p>
        ) : !available ? (
          <p className="py-4 text-center text-gray-500">
            Limelight unavailable
          </p>
        ) : (
          <div className="flex flex-col gap-2 pb-2">
            {/* Camera stream */}
            {showStream ? (
              <div className="relative w-full overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                <img
                  key={streamKey}
                  src={streamUrl}
                  alt="Limelight camera feed"
                  className="w-full"
                  style={{ minHeight: '10rem', objectFit: 'contain' }}
                  onError={() => setShowStream(false)}
                />
              </div>
            ) : (
              <button
                className="rounded bg-gray-200 px-3 py-2 text-sm dark:bg-gray-700"
                onClick={() => {
                  setShowStream(true);
                  setStreamKey((k) => k + 1);
                }}
              >
                Retry camera stream
              </button>
            )}

            {/* Stats */}
            {status && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {status.temp !== undefined && (
                  <span>
                    Temp: <strong>{status.temp.toFixed(1)}°C</strong>
                  </span>
                )}
                {status.cpu !== undefined && (
                  <span>
                    CPU: <strong>{status.cpu.toFixed(1)}%</strong>
                  </span>
                )}
                {status.ram !== undefined && (
                  <span>
                    RAM: <strong>{status.ram.toFixed(1)}%</strong>
                  </span>
                )}
              </div>
            )}

            {/* Open dashboard button */}
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded bg-primary-600 px-4 py-2 text-center text-sm text-white hover:bg-primary-700"
            >
              Open Limelight Dashboard
            </a>
          </div>
        )}
      </BaseViewBody>
    </BaseView>
  );
}
