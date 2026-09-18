import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';
import { RootState } from '@/store/reducers';
import { Telemetry } from '@/store/types/telemetry';

type TelemetryViewProps = BaseViewProps & BaseViewHeadingProps;

const HOLD_TIMEOUT = 10000;

// Incoming packets rewrite the rendered lines several times a second, which
// clears any selection sitting inside them. Updates are held while the user has
// one anchored in the view so that ordinary copy and paste works. A range only
// containing the view, as a select-all does, is not anchored in it.
function hasSelectionIn(node: HTMLElement | null) {
  if (node === null) return false;

  const selection = window.getSelection();
  if (selection === null || selection.isCollapsed) return false;

  return (
    node.contains(selection.anchorNode) || node.contains(selection.focusNode)
  );
}

const TelemetryView = ({
  isDraggable = false,
  isUnlocked = false,
}: TelemetryViewProps) => {
  const [log, setLog] = useState<string[]>([]);
  const [data, setData] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState('');
  const [isHeld, setIsHeld] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let copyTimer: ReturnType<typeof setTimeout> | null = null;

    const onSelectionChange = () => setIsHeld(hasSelectionIn(bodyRef.current));

    // The browser reads the selection into the clipboard once this event has
    // been dispatched, so the lines may only be rewritten after that.
    const onCopy = () => {
      copyTimer = setTimeout(() => setIsHeld(false), 0);
    };

    const onBlur = () => setIsHeld(false);

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('copy', onCopy);
    window.addEventListener('blur', onBlur);

    return () => {
      if (copyTimer !== null) clearTimeout(copyTimer);

      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('copy', onCopy);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    if (!isHeld) return;

    const timer = setTimeout(() => setIsHeld(false), HOLD_TIMEOUT);
    return () => clearTimeout(timer);
  }, [isHeld]);

  const packets = useSelector((state: RootState) => state.telemetry);
  const heldBatches = useRef<Telemetry[]>([]);
  useEffect(() => {
    if (packets.length === 0) {
      heldBatches.current = [];
      setLog([]);
      setData({});
      return;
    }

    const held = heldBatches.current;
    if (held[held.length - 1] !== packets) held.push(packets);

    if (isHeld) return;

    heldBatches.current = [];
    const pending = held.flat();

    setLog((prevLog) =>
      pending.reduce(
        (acc, { log: newLog }) => (newLog.length === 0 ? acc : newLog),
        prevLog,
      ),
    );

    setData((prevData) =>
      pending.reduce(
        (acc, { data: newData }) =>
          Object.keys(newData).reduce(
            (acc, k) => ({ ...acc, [k]: newData[k] }),
            acc,
          ),
        prevData,
      ),
    );
  }, [packets, isHeld]);

  const query = filter.trim().toLowerCase();
  const matches = (text: string) =>
    query === '' || text.toLowerCase().includes(query);

  const telemetryLines = Object.keys(data)
    .filter(matches)
    .map((key) => (
      <span
        key={key}
        dangerouslySetInnerHTML={{ __html: `${key}: ${data[key]}<br />` }}
      />
    ));

  const telemetryLog = log
    .filter(matches)
    .map((line, i) => (
      <span key={i} dangerouslySetInnerHTML={{ __html: `${line}<br />` }} />
    ));

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex items-center">
        <BaseViewHeading
          className="min-w-0 flex-1 basis-24 truncate"
          isDraggable={isDraggable}
        >
          Telemetry
        </BaseViewHeading>
        {isHeld && (
          <span
            className="mr-2 truncate text-xs text-gray-500 dark:text-slate-400"
            title="Updates paused while text is selected"
          >
            paused
          </span>
        )}
        <input
          className="mr-4 w-20 min-w-[4rem] rounded border border-gray-500 bg-gray-100 px-2 py-0.5 text-sm transition-all placeholder:text-gray-600 focus:w-32 focus:ring-1 focus:ring-primary-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-400"
          type="text"
          placeholder="Filter"
          aria-label="Filter telemetry"
          value={filter}
          onChange={(evt) => setFilter(evt.target.value)}
          onKeyDown={(evt) => {
            if (evt.key === 'Escape') setFilter('');
          }}
        />
      </div>
      <BaseViewBody>
        <div ref={bodyRef}>
          <p>{telemetryLines}</p>
          <p>{telemetryLog}</p>
        </div>
      </BaseViewBody>
    </BaseView>
  );
};

export default TelemetryView;
