import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

import BaseView, {
  BaseViewBody,
  BaseViewHeading,
  BaseViewHeadingProps,
  BaseViewIconButton,
  BaseViewIcons,
  BaseViewProps,
} from '@/components/views/BaseView';
import usePersistentState from '@/hooks/usePersistentState';

import { ReactComponent as PauseIcon } from '@/assets/icons/pause.svg';
import { ReactComponent as PlayIcon } from '@/assets/icons/play_arrow.svg';
import { ReactComponent as RefreshIcon } from '@/assets/icons/refresh.svg';
import { ReactComponent as SettingsIcon } from '@/assets/icons/settings.svg';

import BreakdownBar from './BreakdownBar';
import ProfileEditor from './ProfileEditor';
import Sparkline from './Sparkline';
import computeStats, { formatMs } from './stats';
import useLoopSamples, { DEFAULT_MAX_SAMPLES } from './useLoopSamples';
import {
  LoopProfile,
  PROFILES_STORAGE_KEY,
  defaultStore,
  newProfile,
  sanitizeStore,
} from './profiles';

type SummaryProps = {
  label: string;
  value: string;
  emphasize?: boolean;
  warn?: boolean;
};

const Summary = ({ label, value, emphasize, warn }: SummaryProps) => (
  <div className="flex flex-col leading-tight">
    <span className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-slate-400">
      {label}
    </span>
    <span
      className={clsx(
        'font-mono tabular-nums',
        emphasize ? 'text-2xl font-medium' : 'text-sm',
        warn && 'text-red-500',
      )}
    >
      {value}
    </span>
  </div>
);

type LoopTimeViewProps = BaseViewProps & BaseViewHeadingProps;

const LoopTimeView = ({
  isDraggable = false,
  isUnlocked = false,
}: LoopTimeViewProps) => {
  const fallbackStore = useMemo(() => defaultStore(), []);
  const [store, setStore] = usePersistentState(
    PROFILES_STORAGE_KEY,
    fallbackStore,
    sanitizeStore,
  );

  const [showSettings, setShowSettings] = useState(false);
  const [paused, setPaused] = useState(false);

  const { samples, availableKeys, reset } = useLoopSamples(
    DEFAULT_MAX_SAMPLES,
    paused,
  );

  // sanitizeStore guarantees a non-empty profile list and a resolvable id.
  const active =
    store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0];

  const stats = useMemo(() => computeStats(samples, active), [samples, active]);

  const putProfile = (profile: LoopProfile) =>
    setStore({
      ...store,
      profiles: store.profiles.map((p) => (p.id === profile.id ? profile : p)),
    });

  const addProfile = (profile: LoopProfile) =>
    setStore({
      profiles: [...store.profiles, profile],
      activeId: profile.id,
    });

  const overBudget =
    active.budgetMs > 0 &&
    stats.lastTotal !== null &&
    stats.lastTotal > active.budgetMs;

  const configuredKeys = [
    ...active.segments.map((s) => s.key),
    ...(active.totalKey === null ? [] : [active.totalKey]),
    ...(active.worstKey === null ? [] : [active.worstKey]),
  ];
  const missingKeys = configuredKeys.filter(
    (key) => !availableKeys.includes(key),
  );
  const isConfigured = active.segments.length > 0 || active.totalKey !== null;

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>Loop Time</BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton
            title={paused ? 'Resume sampling' : 'Pause sampling'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? (
              <PlayIcon className="h-6 w-6" />
            ) : (
              <PauseIcon className="h-6 w-6" />
            )}
          </BaseViewIconButton>
          <BaseViewIconButton title="Clear collected samples" onClick={reset}>
            <RefreshIcon className="h-6 w-6" />
          </BaseViewIconButton>
          <BaseViewIconButton
            title={showSettings ? 'Hide breakdown setup' : 'Set up breakdown'}
            className={clsx(showSettings && 'text-primary-600')}
            onClick={() => setShowSettings(!showSettings)}
          >
            <SettingsIcon className="h-6 w-6" />
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      <BaseViewBody>
        {showSettings && (
          <ProfileEditor
            profiles={store.profiles}
            active={active}
            availableKeys={availableKeys}
            onSelectProfile={(id) => setStore({ ...store, activeId: id })}
            onChangeProfile={putProfile}
            onCreateProfile={() =>
              addProfile(newProfile(`Profile ${store.profiles.length + 1}`))
            }
            onDuplicateProfile={() =>
              addProfile({
                ...active,
                id: uuidv4(),
                name: `${active.name} copy`,
                segments: active.segments.map((s) => ({ ...s, id: uuidv4() })),
              })
            }
            onDeleteProfile={() => {
              const remaining = store.profiles.filter(
                (p) => p.id !== active.id,
              );
              if (remaining.length === 0) return;
              setStore({ profiles: remaining, activeId: remaining[0].id });
            }}
            onImportProfile={(profile) =>
              addProfile({
                ...profile,
                id: uuidv4(),
                segments: profile.segments.map((s) => ({ ...s, id: uuidv4() })),
              })
            }
          />
        )}

        {!isConfigured ? (
          <div className="flex-center h-full py-8 text-center">
            <div>
              <p>No loop breakdown configured.</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Report your loop timings as numeric telemetry, then use the gear
                icon to pick which keys make up the loop.
              </p>
            </div>
          </div>
        ) : (
          <div className="pb-2">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
              <Summary
                label={paused ? 'Loop (paused)' : 'Loop'}
                value={`${formatMs(stats.lastTotal)} ms`}
                emphasize
                warn={overBudget}
              />
              <Summary label="Avg" value={formatMs(stats.meanTotal)} />
              <Summary label="p95" value={formatMs(stats.p95Total)} />
              <Summary
                label={stats.maxWorst === null ? 'Max' : 'Max (worst loop)'}
                value={formatMs(stats.maxWorst ?? stats.maxTotal)}
              />
              <Summary
                label="Rate"
                value={stats.hz === null ? '—' : `${stats.hz.toFixed(1)} Hz`}
              />
              {active.budgetMs > 0 && (
                <Summary
                  label="Budget"
                  value={`${active.budgetMs} ms`}
                  warn={overBudget}
                />
              )}
            </div>

            <div className="mt-3">
              <BreakdownBar stats={stats} />
            </div>

            <div className="mt-3">
              <Sparkline values={stats.totals} budgetMs={active.budgetMs} />
            </div>

            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <th className="font-medium">Segment</th>
                  <th className="w-16 text-right font-medium">Last</th>
                  <th className="w-16 text-right font-medium">Avg</th>
                  <th className="w-16 text-right font-medium">Max</th>
                  <th className="w-14 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {stats.segments.map((stat) => (
                  <tr
                    key={stat.segment.id}
                    className="border-t border-gray-100 dark:border-slate-800"
                  >
                    <td className="py-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 flex-shrink-0 rounded-sm"
                          style={{ background: stat.segment.color }}
                        />
                        <span className="truncate">{stat.segment.label}</span>
                      </span>
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {formatMs(stat.last)}
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {formatMs(stat.mean)}
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {formatMs(stat.max)}
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {stat.last === null
                        ? '—'
                        : `${(stat.share * 100).toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
                {stats.hasUnaccounted && (
                  <tr className="border-t border-gray-100 dark:border-slate-800">
                    <td className="py-1">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 flex-shrink-0 rounded-sm bg-slate-400" />
                        <span className="italic text-gray-500 dark:text-slate-400">
                          Unaccounted
                        </span>
                      </span>
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {formatMs(stats.unaccounted)}
                    </td>
                    <td className="text-right">—</td>
                    <td className="text-right">—</td>
                    <td className="text-right font-mono tabular-nums">
                      {stats.lastTotal === null || stats.lastTotal <= 0
                        ? '—'
                        : `${(
                            (stats.unaccounted / stats.lastTotal) *
                            100
                          ).toFixed(0)}%`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {missingKeys.length > 0 && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Waiting on telemetry for: {missingKeys.join(', ')}
              </p>
            )}
          </div>
        )}
      </BaseViewBody>
    </BaseView>
  );
};

export default LoopTimeView;
