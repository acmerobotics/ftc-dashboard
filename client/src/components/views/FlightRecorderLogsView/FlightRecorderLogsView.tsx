import { useEffect, useState } from 'react';
import BaseView, {
  BaseViewBody,
  BaseViewHeading,
  BaseViewHeadingProps,
  BaseViewProps,
} from '@/components/views/BaseView';

import { ReactComponent as RefreshIcon } from '@/assets/icons/refresh.svg';
import { ReactComponent as DownloadSVG } from '@/assets/icons/file_download.svg';
import { decodeFlightRecorder, toChannelBuckets } from '@/utils/flightrecorder/decoder';

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
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    file: string;
    channels: string[];
    samples: Record<string, any[]>;
  } | null>(null);

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

  async function previewLog(fileName: string) {
    try {
      setPreviewLoading(fileName);
      setPreviewError(null);
      setPreviewData(null);
      const resp = await fetch(`/dash/logs/download?file=${encodeURIComponent(fileName)}`, {
        cache: 'no-store',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buf = await resp.arrayBuffer();
      const decoded = decodeFlightRecorder(buf);
      const buckets = toChannelBuckets(decoded);
      const channels = Object.keys(buckets);
      const samples: Record<string, any[]> = {};
      for (const ch of channels) {
        samples[ch] = buckets[ch].slice(0, 5);
      }
      setPreviewData({ file: fileName, channels, samples });
    } catch (e: any) {
      setPreviewError(e?.message ?? String(e));
    } finally {
      setPreviewLoading(null);
    }
  }

  async function downloadDecodedJSON(fileName: string) {
    try {
      // Fetch and decode the full log file (not just preview samples)
      const resp = await fetch(`/dash/logs/download?file=${encodeURIComponent(fileName)}`, {
        cache: 'no-store',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buf = await resp.arrayBuffer();
      const decoded = decodeFlightRecorder(buf);
      const buckets = toChannelBuckets(decoded);

      // Download the full decoded data, not just preview samples
      const blob = new Blob([JSON.stringify(buckets, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace('.log', '')}_decoded.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('JSON download failed:', error);
      alert(`Failed to download JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

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
                  <th className="py-2 pr-4">Preview</th>
                  <th className="py-2 pr-4">Decode JSON</th>
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
                    <td className="py-2 pr-4">
                      <button
                        className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700"
                        onClick={() => previewLog(f.name)}
                        disabled={!!previewLoading}
                      >
                        {previewLoading === f.name ? 'Decoding…' : 'Preview'}
                      </button>
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700"
                        onClick={() => downloadDecodedJSON(f.name)}
                        title="Download decoded JSON"
                      >
                        Download JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(previewError || previewData) && (
          <div className="mt-4">
            {previewError && (
              <p className="text-red-600 dark:text-red-400">Preview error: {previewError}</p>
            )}
            {previewData && (
              <div>
                <h3 className="mb-2 text-base font-medium">Preview: {previewData.file}</h3>
                {previewData.channels.length === 0 ? (
                  <p>No channels found in this log.</p>
                ) : (
                  <div className="space-y-3">
                    {previewData.channels.map((ch) => (
                      <div key={ch} className="rounded border border-gray-200 p-2 dark:border-slate-700">
                        <div className="mb-1 font-mono text-xs">Channel: {ch}</div>
                        {previewData.samples[ch].length === 0 ? (
                          <div className="text-sm text-gray-500">No messages</div>
                        ) : (
                          <pre className="max-h-48 overflow-auto rounded bg-gray-50 p-2 text-xs dark:bg-slate-800">{JSON.stringify(previewData.samples[ch], null, 2)}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </BaseViewBody>
    </BaseView>
  );
}
