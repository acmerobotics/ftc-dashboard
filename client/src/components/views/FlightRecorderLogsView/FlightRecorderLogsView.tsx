import { useEffect, useState } from 'react';
import BaseView, {
  BaseViewBody,
  BaseViewHeading,
  BaseViewHeadingProps,
  BaseViewProps,
} from '@/components/views/BaseView';

import { ReactComponent as RefreshIcon } from '@/assets/icons/refresh.svg';
import { ReactComponent as DownloadSVG } from '@/assets/icons/file_download.svg';

export type FlightRecorderLogsViewProps = BaseViewProps & BaseViewHeadingProps;

type LogFile = {
  name: string;
  size: number;
  lastModified: number;
};

function humanSize(bytes: number): string {
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + ' ' + units[u];
}

export default function FlightRecorderLogsView({
  isDraggable = false,
  isUnlocked = false,
}: FlightRecorderLogsViewProps) {
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLogs() {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch('/dash/logs/list', { cache: 'no-store' });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as LogFile[];
      setLogs(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex-center">
        <BaseViewHeading isDraggable={isDraggable}>
          Flight Recorder Logs
        </BaseViewHeading>
        <button
          className="icon-btn h-8 w-8"
          onClick={() => fetchLogs()}
          title="Refresh"
        >
          <RefreshIcon className="h-6 w-6" />
        </button>
      </div>
      <BaseViewBody>
        {loading && <p>Loading…</p>}
        {error && (
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        )}
        {!loading && !error && logs.length === 0 && (
          <p>No FlightRecorder logs found.</p>
        )}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="py-2 pr-4">File</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Last Modified</th>
                  <th className="py-2 pr-4">Download</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((f) => (
                  <tr
                    key={f.name}
                    className="border-b border-gray-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-4 font-mono text-xs sm:text-sm">
                      {f.name}
                    </td>
                    <td className="py-2 pr-4">{humanSize(f.size)}</td>
                    <td className="py-2 pr-4">
                      {new Date(f.lastModified).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <a
                        className="inline-flex items-center rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700"
                        href={`/dash/logs/download?file=${encodeURIComponent(f.name)}`}
                        download
                      >
                        <DownloadSVG className="mr-1 h-5 w-5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BaseViewBody>
    </BaseView>
  );
}
