import { useId, useState } from 'react';
import { useSelector } from 'react-redux';
import clsx from 'clsx';

import BaseView, {
  BaseViewBody,
  BaseViewHeading,
  BaseViewHeadingProps,
  BaseViewIconButton,
  BaseViewIcons,
  BaseViewProps,
} from '@/components/views/BaseView';
import usePersistentState from '@/hooks/usePersistentState';
import OpModeStatus from '@/enums/OpModeStatus';
import { RootState } from '@/store/reducers';

import { ReactComponent as SettingsIcon } from '@/assets/icons/settings.svg';

import ColorSettings from './ColorSettings';
import ExpectedColorPanel from './ExpectedColorPanel';
import { NormalizationMode } from './colorUtils';
import {
  SETTINGS_STORAGE_KEY,
  EXPECTED_COLOR_STORAGE_KEY,
  DEFAULT_EXPECTED,
  MIN_DIVISOR,
  sanitizeExpected,
} from './expectedColor';
import useColorSensors, {
  ColorSensorReading,
  displayColor,
} from './useColorSensors';
import inputClass from './inputClass';

type ColorViewSettings = {
  mode: NormalizationMode;
  divisor: number;
  sensorName: string | null;
};

const DEFAULT_SETTINGS: ColorViewSettings = {
  mode: 'auto',
  divisor: 1000,
  sensorName: null,
};

function sanitizeSettings(raw: unknown): ColorViewSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;

  const { mode, divisor, sensorName } = raw as Record<string, unknown>;
  const validModes: NormalizationMode[] = ['auto', 'byte', 'alpha', 'manual'];

  return {
    mode: validModes.includes(mode as NormalizationMode)
      ? (mode as NormalizationMode)
      : DEFAULT_SETTINGS.mode,
    divisor:
      typeof divisor === 'number' &&
      Number.isFinite(divisor) &&
      divisor >= MIN_DIVISOR
        ? divisor
        : DEFAULT_SETTINGS.divisor,
    sensorName: typeof sensorName === 'string' ? sensorName : null,
  };
}

type ColorViewProps = BaseViewProps & BaseViewHeadingProps;

const ColorView = ({
  isDraggable = false,
  isUnlocked = false,
}: ColorViewProps) => {
  const sensors = useColorSensors();
  const instanceId = useId();

  const isStale = useSelector(
    (state: RootState) =>
      !state.socket.isConnected ||
      state.status.activeOpModeStatus === OpModeStatus.STOPPED,
  );

  const [settings, setSettings] = usePersistentState(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
    sanitizeSettings,
  );
  const [expected, setExpected] = usePersistentState(
    EXPECTED_COLOR_STORAGE_KEY,
    DEFAULT_EXPECTED,
    sanitizeExpected,
  );

  const [showSettings, setShowSettings] = useState(false);

  const selected: ColorSensorReading | null =
    sensors.find((sensor) => sensor.name === settings.sensorName) ??
    sensors[0] ??
    null;

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>Color</BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton
            title={showSettings ? 'Hide settings' : 'Show settings'}
            className={clsx(showSettings && 'text-primary-600')}
            onClick={() => setShowSettings(!showSettings)}
          >
            <SettingsIcon className="h-6 w-6" />
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      <BaseViewBody>
        {showSettings && (
          <ColorSettings
            mode={settings.mode}
            onModeChange={(mode) => setSettings({ ...settings, mode })}
            divisor={settings.divisor}
            onDivisorChange={(divisor) => setSettings({ ...settings, divisor })}
          />
        )}

        {selected === null ? (
          <div className="flex-center h-full py-8 text-center">
            <div>
              <p>No color sensors detected.</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Run the <strong>Hardware</strong> op mode with an I2C color
                sensor in your configuration to get started.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {sensors.length > 1 && (
                <>
                  <label
                    className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                    htmlFor={`${instanceId}-sensor`}
                  >
                    Sensor
                  </label>
                  <select
                    id={`${instanceId}-sensor`}
                    className={inputClass}
                    value={selected.name}
                    onChange={(e) =>
                      setSettings({ ...settings, sensorName: e.target.value })
                    }
                  >
                    {sensors.map((sensor) => (
                      <option key={sensor.name} value={sensor.name}>
                        {sensor.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <span className="font-mono text-xs text-gray-500 dark:text-slate-400">
                {selected.name}
                {selected.port !== null && ` - ${selected.port}`}
              </span>
            </div>

            <ExpectedColorPanel
              expected={expected}
              onExpectedChange={setExpected}
              sensed={displayColor(selected, settings.mode, settings.divisor)}
              mode={settings.mode}
              isStale={isStale}
            />
          </>
        )}
      </BaseViewBody>
    </BaseView>
  );
};

export default ColorView;
