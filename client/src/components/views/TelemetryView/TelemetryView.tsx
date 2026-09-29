import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { Transition } from '@headlessui/react';
import clsx from 'clsx';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from '@/components/views/BaseView';
import sanitizeTelemetryHtml, {
  truncateTelemetry,
} from '@/components/views/TelemetryView/sanitizeTelemetryHtml';
import { RootState } from '@/store/reducers';
import { TelemetryDisplayFormat } from '@/store/types/telemetry';
import buildFrame, {
  DisplayedLine,
  Frame,
} from '@/components/views/TelemetryView/buildFrame';
import useOnClickOutside from '@/hooks/useOnClickOutside';

import { ReactComponent as MoreVertSVG } from '@/assets/icons/more_vert.svg';

type TelemetryViewProps = BaseViewProps & BaseViewHeadingProps;

// `null` follows each packet's own format; the others override every line.
type FormatOverride = TelemetryDisplayFormat | null;

const MENU_GAP = 8;

const FORMAT_OPTIONS: { label: string; value: FormatOverride }[] = [
  { label: 'Auto', value: null },
  { label: 'Classic', value: 'CLASSIC' },
  { label: 'Monospace', value: 'MONOSPACE' },
  { label: 'HTML', value: 'HTML' },
];

const TelemetryView = ({
  isDraggable = false,
  isUnlocked = false,
}: TelemetryViewProps) => {
  const packets = useSelector((state: RootState) => state.telemetry);

  // A drawing-only batch leaves the last real frame in place.
  const lastFrame = useRef<Frame>({ entries: [], log: [] });

  const { entries, log } = useMemo(() => {
    const frame = buildFrame(packets);
    if (frame !== null) lastFrame.current = frame;
    return lastFrame.current;
  }, [packets]);

  const [formatOverride, setFormatOverride] = useState<FormatOverride>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  // Portalled with fixed coordinates, so a small tile can neither clip the menu nor leave the edit
  // button over it. It opens above the button when the viewport has no room below.
  const placeMenu = useCallback(() => {
    const button = menuButtonRef.current?.getBoundingClientRect();
    if (!button) return;

    const height = menuRef.current?.offsetHeight ?? 0;
    const { clientWidth, clientHeight } = document.documentElement;
    const below = button.bottom + MENU_GAP;

    setMenuPosition({
      top:
        below + height <= clientHeight
          ? below
          : Math.max(0, button.top - MENU_GAP - height),
      right: clientWidth - button.right,
    });
  }, []);

  useEffect(() => {
    if (!isMenuVisible) return undefined;

    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [isMenuVisible, placeMenu]);

  useOnClickOutside(
    menuRef,
    () => {
      if (isMenuVisible) setIsMenuVisible(false);
    },
    [menuButtonRef],
  );

  // Per line, not per container: lines from different sources can be in different formats.
  const renderLine = (key: string, line: DisplayedLine) => {
    const { caption, value, separator } = line;
    const displayFormat = formatOverride ?? line.displayFormat;

    const renderText = (text: string) =>
      displayFormat === 'HTML'
        ? sanitizeTelemetryHtml(text)
        : truncateTelemetry(text);

    return (
      <div
        key={key}
        className={clsx(
          'break-words',
          displayFormat === 'MONOSPACE' && 'font-mono',
          displayFormat === 'HTML' ? 'telemetry-html' : 'whitespace-pre-wrap',
        )}
      >
        {/* An empty div collapses to nothing, so a blank line gets a non-breaking space to keep
            the height the Driver Station gives it. */}
        {caption == null &&
        (displayFormat === 'HTML' ? value.trim() === '' : value === '') ? (
          ' '
        ) : (
          <>
            {caption != null && (
              <>
                {renderText(caption)}
                {separator}
              </>
            )}
            {renderText(value)}
          </>
        )}
      </div>
    );
  };

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex-center">
        <BaseViewHeading isDraggable={isDraggable}>
          Telemetry
          {/* An override is easy to set and forget, so say so rather than leaving someone to
              wonder why their telemetry renders differently here than anywhere else. */}
          {formatOverride !== null && (
            <span className="ml-2 align-middle text-sm font-normal text-gray-500 dark:text-gray-400">
              {formatOverride.toLowerCase()}
            </span>
          )}
        </BaseViewHeading>
        <div className="mr-3 flex items-center space-x-1">
          <button
            ref={menuButtonRef}
            className="icon-btn h-8 w-8"
            onClick={() => setIsMenuVisible(!isMenuVisible)}
          >
            <MoreVertSVG className="h-6 w-6" />
          </button>
          {createPortal(
            <Transition
              ref={menuRef}
              show={isMenuVisible}
              beforeEnter={placeMenu}
              className="fixed z-50 origin-top-right rounded-md border border-gray-200 bg-white py-2 text-black shadow-lg outline-none dark:bg-slate-700 dark:text-white"
              style={menuPosition}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <p className="mb-1 whitespace-nowrap border-b border-gray-100 pb-1 pl-3 pr-3 text-sm leading-5">
                Display Format
              </p>
              {FORMAT_OPTIONS.map(({ label, value }) => (
                <button
                  key={label}
                  className={clsx(
                    'block w-full whitespace-nowrap px-3 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-600',
                    formatOverride === value && 'font-medium',
                  )}
                  onClick={() => {
                    setFormatOverride(value);
                    setIsMenuVisible(false);
                  }}
                >
                  <span className="inline-block w-4">
                    {formatOverride === value ? '✓' : ''}
                  </span>
                  {label}
                </button>
              ))}
            </Transition>,
            document.body,
          )}
        </div>
      </div>
      <BaseViewBody>
        <div>
          {entries.map((entry, i) => renderLine(`item-${i}`, entry))}
          {/* The log always sits below the telemetry items, matching the Driver Station. */}
          {log.map((line, i) => renderLine(`log-${i}`, line))}
        </div>
      </BaseViewBody>
    </BaseView>
  );
};

export default TelemetryView;
