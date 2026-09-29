import { Fragment, useEffect, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import clsx from 'clsx';

import { SavedLayout } from '@/store/types';

import { buildLayoutLink } from './layoutCode';

type ShareLayoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  // Set when the current layout cannot be shared, e.g. it is empty.
  exportError: string | null;
  initialImportText: string;
  // Returns an error message, or null when the layout was applied.
  onImport: (text: string) => string | null;
  savedLayouts: SavedLayout[];
  // Name of the saved layout the current one came from, if any.
  activeLayoutName: string | null;
  // Returns an error message, or null when the layout was saved.
  onSave: (name: string) => string | null;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
};

type CopyKind = 'code' | 'link';
type CopyStatus = { kind: CopyKind; ok: boolean };

// Short enough that a name fits the header list without stretching it.
const LAYOUT_NAME_MAX_LENGTH = 24;

const BUTTON_CLASSES = clsx(
  'rounded px-3 py-1 text-sm transition-colors',
  'border border-gray-300 bg-gray-100 hover:border-gray-500',
  'dark:border-slate-500 dark:bg-slate-600 dark:hover:border-slate-300',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

const SMALL_BUTTON_CLASSES = clsx(
  BUTTON_CLASSES,
  'px-2 py-0.5 text-xs shrink-0',
);

const FIELD_CLASSES = clsx(
  'rounded border-gray-300 bg-gray-50',
  'focus:border-primary-500 focus:ring-primary-500',
  'dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100',
);

const TEXTAREA_CLASSES = clsx(
  FIELD_CLASSES,
  'w-full resize-none font-mono text-xs',
);

const NOTE_CLASSES = 'mb-2 text-sm text-gray-600 dark:text-slate-300';
const ERROR_CLASSES = 'text-sm text-red-600 dark:text-red-400';
const OK_CLASSES = 'text-sm text-green-600 dark:text-green-400';

async function copyToClipboard(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error(err);
    }
  }

  // The dashboard is normally served over plain HTTP from the robot, where
  // the async clipboard API is unavailable.
  const previouslyFocused = document.activeElement;
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.readOnly = true;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.opacity = '0';
  document.body.append(textArea);
  textArea.select();
  textArea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (err) {
    console.error(err);
  }
  document.body.removeChild(textArea);
  if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
  return ok;
}

export default function ShareLayoutModal({
  isOpen,
  onClose,
  code,
  exportError,
  initialImportText,
  onImport,
  savedLayouts,
  activeLayoutName,
  onSave,
  onLoad,
  onDelete,
}: ShareLayoutModalProps) {
  const [copied, setCopied] = useState<CopyStatus | null>(null);
  const [layoutName, setLayoutName] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const applyButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Start fresh when the dialog opens, but leave typed text alone while it is
  // open: saving changes activeLayoutName, and that must not wipe the form.
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setImportText(initialImportText);
      setImportError(null);
      setCopied(null);
      setLayoutName(activeLayoutName ?? '');
      setIsSaved(false);
      setSaveError(null);
    }
    wasOpen.current = isOpen;
  }, [isOpen, initialImportText, activeLayoutName]);

  // A link opened while the dialog is already up still fills the import box.
  useEffect(() => {
    if (isOpen && initialImportText !== '') {
      setImportText(initialImportText);
      setImportError(null);
    }
  }, [isOpen, initialImportText]);

  useEffect(() => {
    if (copied === null || !copied.ok) return;
    const timeout = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (!isSaved) return;
    const timeout = window.setTimeout(() => setIsSaved(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [isSaved]);

  const copy = (kind: CopyKind) => {
    const text = kind === 'link' ? buildLayoutLink(code) : code;
    copyToClipboard(text).then((ok) => setCopied({ kind, ok }));
  };

  const canSave = exportError === null && layoutName.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const error = onSave(layoutName.trim());
    setSaveError(error);
    setIsSaved(error === null);
  };

  const applyImport = () => {
    setImportError(onImport(importText));
  };

  return (
    <Transition as={Fragment} show={isOpen}>
      <Dialog
        onClose={onClose}
        // Focus the code for copying, or Apply when opened from a link.
        initialFocus={initialImportText ? applyButtonRef : undefined}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto text-black dark:text-white">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-md bg-white px-6 py-6 text-left shadow-xl transition-all dark:bg-slate-700">
                <Dialog.Title className="mb-4 text-xl font-medium">
                  Share or Save Layout
                </Dialog.Title>

                <h3 className="text-lg font-bold">This layout</h3>
                <p className={NOTE_CLASSES}>
                  Send the code or link to another dashboard user. The link only
                  works when their dashboard has the same address.
                </p>
                {exportError !== null ? (
                  <p className={clsx(TEXTAREA_CLASSES, 'px-3 py-2')}>
                    {exportError}
                  </p>
                ) : (
                  <textarea
                    className={TEXTAREA_CLASSES}
                    aria-label="Layout code"
                    rows={3}
                    readOnly
                    value={code}
                    onFocus={(e) => e.target.select()}
                  />
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className={BUTTON_CLASSES}
                    onClick={() => copy('code')}
                    disabled={exportError !== null}
                  >
                    Copy code
                  </button>
                  <button
                    className={BUTTON_CLASSES}
                    onClick={() => copy('link')}
                    disabled={exportError !== null}
                  >
                    Copy link
                  </button>
                  <span
                    aria-live="polite"
                    className={
                      copied?.ok === false ? ERROR_CLASSES : OK_CLASSES
                    }
                  >
                    {copied === null
                      ? ''
                      : copied.ok
                      ? `Copied ${copied.kind}`
                      : 'Copy failed. Select the code and copy it yourself.'}
                  </span>
                </div>

                <div className="my-4 h-px bg-gray-300 dark:bg-slate-500" />

                <h3 className="text-lg font-bold">Save in this browser</h3>
                <p className={NOTE_CLASSES}>
                  Saved layouts appear in the layout list at the top of the
                  page. They stay in this browser only.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className={clsx(
                      FIELD_CLASSES,
                      'min-w-0 flex-1 py-1 text-sm',
                    )}
                    aria-label="Layout name"
                    placeholder="Layout name"
                    maxLength={LAYOUT_NAME_MAX_LENGTH}
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') save();
                    }}
                  />
                  <button
                    className={BUTTON_CLASSES}
                    onClick={save}
                    disabled={!canSave}
                  >
                    Save
                  </button>
                  <span
                    aria-live="polite"
                    className={clsx(OK_CLASSES, 'w-12 shrink-0')}
                  >
                    {isSaved ? 'Saved' : ''}
                  </span>
                </div>
                {saveError !== null && (
                  <p role="alert" className={clsx(ERROR_CLASSES, 'mt-1')}>
                    {saveError}
                  </p>
                )}
                {savedLayouts.length > 0 && (
                  <ul className="mt-2 max-h-32 divide-y divide-gray-200 overflow-y-auto dark:divide-slate-600">
                    {savedLayouts.map((layout) => (
                      <li
                        key={layout.id}
                        className="flex items-center justify-between gap-2 py-1"
                      >
                        <span className="truncate text-sm">{layout.name}</span>
                        <span className="flex shrink-0 gap-2">
                          <button
                            className={SMALL_BUTTON_CLASSES}
                            aria-label={`Load ${layout.name}`}
                            onClick={() => onLoad(layout.id)}
                          >
                            Load
                          </button>
                          <button
                            className={SMALL_BUTTON_CLASSES}
                            aria-label={`Delete ${layout.name}`}
                            onClick={() => onDelete(layout.id)}
                          >
                            Delete
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="my-4 h-px bg-gray-300 dark:bg-slate-500" />

                <h3 className="text-lg font-bold">Import a layout</h3>
                <p className={NOTE_CLASSES}>
                  Paste a layout code or link. This replaces your current custom
                  layout.
                </p>
                <textarea
                  className={TEXTAREA_CLASSES}
                  aria-label="Layout code or link to import"
                  rows={3}
                  placeholder="v1;field:0,0,4,9;graph:4,0,4,9"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    ref={applyButtonRef}
                    className={BUTTON_CLASSES}
                    onClick={applyImport}
                    disabled={importText.trim().length === 0}
                  >
                    Apply
                  </button>
                  <span aria-live="polite" className={ERROR_CLASSES}>
                    {importError ?? ''}
                  </span>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
