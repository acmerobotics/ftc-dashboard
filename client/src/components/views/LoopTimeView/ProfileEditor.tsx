import { useState } from 'react';
import clsx from 'clsx';

import { ReactComponent as AddIcon } from '@/assets/icons/add.svg';
import { ReactComponent as DeleteIcon } from '@/assets/icons/delete.svg';
import { ValResult, validateDouble } from '@/components/inputs/validation';
import TextInput from '@/components/views/ConfigView/inputs/TextInput';

import {
  LoopProfile,
  LoopSegment,
  TimeUnit,
  UNIT_LABELS,
  labelFromKey,
  newSegment,
  sanitizeStore,
} from './profiles';

const inputClass = clsx(
  'rounded border border-gray-200 bg-gray-100 px-2 py-1 text-sm transition',
  'focus:border-primary-500 focus:ring-primary-500',
  'dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200',
);

const buttonClass = clsx(
  'rounded border border-gray-300 px-2 py-1 text-xs transition',
  'hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40',
  'dark:border-slate-600 dark:hover:bg-slate-700',
);

const SUM_OF_SEGMENTS = '__sum__';
const NO_KEY = '__none__';

function keyOptions(available: string[], excluded: (string | null)[]) {
  const drop = new Set(excluded.filter((key): key is string => key !== null));
  return available.filter((key) => !drop.has(key));
}

type ProfileEditorProps = {
  profiles: LoopProfile[];
  active: LoopProfile;
  availableKeys: string[];
  onSelectProfile: (id: string) => void;
  onChangeProfile: (profile: LoopProfile) => void;
  onCreateProfile: () => void;
  onDuplicateProfile: () => void;
  onDeleteProfile: () => void;
  onImportProfile: (profile: LoopProfile) => void;
};

const ProfileEditor = ({
  profiles,
  active,
  availableKeys,
  onSelectProfile,
  onChangeProfile,
  onCreateProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onImportProfile,
}: ProfileEditorProps) => {
  const [prefix, setPrefix] = useState('loop');
  const [budget, setBudget] = useState<{
    id: string;
    result: ValResult<number>;
  }>({ id: active.id, result: { value: active.budgetMs, valid: true } });
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferText, setTransferText] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Neither the loop total nor the worst loop is a slice of the loop, so they
  // never offer themselves as segments.
  const usedKeys = new Set(active.segments.map((s) => s.key));
  const unusedKeys = keyOptions(availableKeys, [
    active.totalKey,
    active.worstKey,
  ]).filter((key) => !usedKeys.has(key));

  // Only an uncommitted entry is kept locally; anything committed comes from
  // the store, which another view or tab may have changed since.
  const budgetResult: ValResult<number> =
    budget.id === active.id &&
    !(budget.result.valid && budget.result.value >= 0)
      ? budget.result
      : { value: active.budgetMs, valid: true };
  const budgetValid = budgetResult.valid && budgetResult.value >= 0;

  const segmentKeys = active.segments.map((s) => s.key);

  const totalKeyOptions = [
    ...new Set([
      ...keyOptions(availableKeys, [active.worstKey, ...segmentKeys]),
      ...(active.totalKey === null ? [] : [active.totalKey]),
    ]),
  ].sort();

  const worstKeyOptions = [
    ...new Set([
      ...keyOptions(availableKeys, [active.totalKey, ...segmentKeys]),
      ...(active.worstKey === null ? [] : [active.worstKey]),
    ]),
  ].sort();

  const setSegments = (segments: LoopSegment[]) =>
    onChangeProfile({ ...active, segments });

  const updateSegment = (id: string, patch: Partial<LoopSegment>) =>
    setSegments(
      active.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

  const moveSegment = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= active.segments.length) return;

    const reordered = [...active.segments];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    setSegments(reordered);
  };

  const addMatchingKeys = () => {
    const needle = prefix.trim().toLowerCase();
    const matches = unusedKeys.filter(
      (key) => needle === '' || key.toLowerCase().includes(needle),
    );
    if (matches.length === 0) return;

    // `LoopTimer` publishes the whole loop as `<prefix>/total` and its worst
    // iteration as `<prefix>/worst`. Neither is a slice of the bar.
    const totalMatch =
      active.totalKey === null
        ? matches.find((key) => /(^|[/.])total$/i.test(key)) ?? null
        : null;
    const worstMatch =
      active.worstKey === null
        ? matches.find(
            (key) => key !== totalMatch && /(^|[/.])worst$/i.test(key),
          ) ?? null
        : null;

    const segmentKeys = matches.filter(
      (key) => key !== totalMatch && key !== worstMatch,
    );

    onChangeProfile({
      ...active,
      totalKey: totalMatch ?? active.totalKey,
      worstKey: worstMatch ?? active.worstKey,
      segments: [
        ...active.segments,
        ...segmentKeys.map((key, i) =>
          newSegment(key, active.segments.length + i),
        ),
      ],
    });
  };

  const exportProfile = () => {
    setTransferText(JSON.stringify(active, null, 2));
    setTransferError(null);
    setShowTransfer(true);
  };

  const importProfile = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(transferText);
    } catch {
      setTransferError('That is not valid JSON.');
      return;
    }

    // Reuse the store sanitizer so an imported profile gets the same
    // validation as anything loaded from localStorage.
    const { profiles: imported } = sanitizeStore({
      profiles: [parsed],
      activeId: '',
    });
    const candidate = imported[0];

    if (candidate.segments.length === 0 && candidate.totalKey === null) {
      setTransferError('No segments or total key found in that profile.');
      return;
    }

    setTransferError(null);
    onImportProfile(candidate);
  };

  return (
    <div className="mb-4 rounded border border-gray-200 p-3 dark:border-slate-700">
      <h3 className="mb-2 font-medium">Profile</h3>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={inputClass}
          aria-label="Active profile"
          value={active.id}
          onChange={(e) => onSelectProfile(e.target.value)}
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <input
          className={clsx(inputClass, 'flex-1')}
          aria-label="Profile name"
          value={active.name}
          onChange={(e) => onChangeProfile({ ...active, name: e.target.value })}
        />
        <button type="button" className={buttonClass} onClick={onCreateProfile}>
          New
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={onDuplicateProfile}
        >
          Duplicate
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={profiles.length <= 1}
          title={
            profiles.length <= 1
              ? 'At least one profile is required'
              : `Delete ${active.name}`
          }
          onClick={onDeleteProfile}
        >
          Delete
        </button>
        <button type="button" className={buttonClass} onClick={exportProfile}>
          Share
        </button>
      </div>

      {showTransfer && (
        <div className="mt-2">
          <textarea
            className={clsx(inputClass, 'h-28 w-full font-mono text-xs')}
            aria-label="Profile JSON"
            value={transferText}
            spellCheck={false}
            onChange={(e) => setTransferText(e.target.value)}
          />
          {transferError !== null && (
            <p className="text-xs text-red-500">{transferError}</p>
          )}
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              className={buttonClass}
              onClick={importProfile}
            >
              Import as new profile
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => setShowTransfer(false)}
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Copy this JSON to move a breakdown between machines, or paste one in
            and import it.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          Values are in
          <select
            className={inputClass}
            value={active.unit}
            onChange={(e) =>
              onChangeProfile({ ...active, unit: e.target.value as TimeUnit })
            }
          >
            {Object.entries(UNIT_LABELS).map(([unit, label]) => (
              <option key={unit} value={unit}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Loop total
          <select
            className={inputClass}
            value={active.totalKey ?? SUM_OF_SEGMENTS}
            onChange={(e) =>
              onChangeProfile({
                ...active,
                totalKey:
                  e.target.value === SUM_OF_SEGMENTS ? null : e.target.value,
              })
            }
          >
            <option value={SUM_OF_SEGMENTS}>Sum of segments</option>
            {totalKeyOptions.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Worst loop
          <select
            className={inputClass}
            value={active.worstKey ?? NO_KEY}
            onChange={(e) =>
              onChangeProfile({
                ...active,
                worstKey: e.target.value === NO_KEY ? null : e.target.value,
              })
            }
          >
            <option value={NO_KEY}>Not reported</option>
            {worstKeyOptions.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Budget (ms)
          <TextInput
            key={active.id}
            value={budgetResult.value}
            valid={budgetValid}
            validate={validateDouble}
            onChange={(result) => {
              setBudget({ id: active.id, result });
              if (result.valid && result.value >= 0) {
                onChangeProfile({ ...active, budgetMs: result.value });
              }
            }}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Segments</h3>
        <div className="flex flex-wrap items-center gap-1">
          <input
            className={clsx(inputClass, 'w-24')}
            aria-label="Key filter"
            placeholder="loop"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
          <button
            type="button"
            className={buttonClass}
            disabled={unusedKeys.length === 0}
            title="Add every unused telemetry key containing this text"
            onClick={addMatchingKeys}
          >
            Auto-add matching
          </button>
          <select
            className={clsx(inputClass, 'max-w-[10rem]')}
            aria-label="Add a segment"
            value=""
            disabled={unusedKeys.length === 0}
            onChange={(e) => {
              if (e.target.value === '') return;
              setSegments([
                ...active.segments,
                newSegment(e.target.value, active.segments.length),
              ]);
            }}
          >
            <option value="">
              {unusedKeys.length === 0 ? 'No unused keys' : 'Add key…'}
            </option>
            {unusedKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </div>

      {active.segments.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          No segments yet. Send numeric telemetry from your op mode, then add
          the keys that make up your loop.
        </p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
              <th className="w-10 font-medium">Color</th>
              <th className="font-medium">Label</th>
              <th className="font-medium">Telemetry key</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {active.segments.map((segment, index) => {
              // A key in two rows would double-count it, so each row offers
              // only the keys no other row and neither readout has claimed.
              const rowOptions = [
                ...new Set([
                  ...keyOptions(availableKeys, [
                    active.totalKey,
                    active.worstKey,
                    ...active.segments
                      .filter((s) => s.id !== segment.id)
                      .map((s) => s.key),
                  ]),
                  segment.key,
                ]),
              ].sort();

              return (
                <tr key={segment.id}>
                  <td className="py-1">
                    <input
                      type="color"
                      aria-label={`${segment.label} color`}
                      className="h-7 w-8 cursor-pointer rounded border border-gray-300 bg-transparent p-0.5 dark:border-slate-600"
                      value={segment.color.toLowerCase()}
                      onChange={(e) =>
                        updateSegment(segment.id, { color: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      className={clsx(inputClass, 'w-full')}
                      aria-label={`${segment.label} label`}
                      value={segment.label}
                      onChange={(e) =>
                        updateSegment(segment.id, { label: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className={clsx(inputClass, 'w-full')}
                      aria-label={`${segment.label} telemetry key`}
                      value={segment.key}
                      onChange={(e) =>
                        updateSegment(segment.id, {
                          key: e.target.value,
                          label:
                            segment.label === labelFromKey(segment.key)
                              ? labelFromKey(e.target.value)
                              : segment.label,
                        })
                      }
                    >
                      {rowOptions.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className={buttonClass}
                        disabled={index === 0}
                        title="Move up"
                        onClick={() => moveSegment(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        disabled={index === active.segments.length - 1}
                        title="Move down"
                        onClick={() => moveSegment(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        title={`Remove ${segment.label}`}
                        onClick={() =>
                          setSegments(
                            active.segments.filter((s) => s.id !== segment.id),
                          )
                        }
                      >
                        <DeleteIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {availableKeys.length === 0 && (
        <p className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
          <AddIcon className="h-3 w-3" />
          No numeric telemetry seen yet. Start an op mode that reports timings.
        </p>
      )}
    </div>
  );
};

export default ProfileEditor;
