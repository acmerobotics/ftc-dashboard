import React from 'react';
import { ReactComponent as RemoveCircleOutline } from '@/assets/icons/remove_circle_outline.svg';
import { ReactComponent as ExpandMore } from '@/assets/icons/expand_more.svg';

export interface MaxDevices {
  controlHubs: number;
  expansionHubs: number;
  motors: number;
  servos: number;
  digitalDevices: number;
  analogInputDevices: number;
}

export const maxDevices: MaxDevices = {
  controlHubs: 1,
  expansionHubs: 1,
  motors: 4,
  servos: 6,
  digitalDevices: 8,
  analogInputDevices: 4,
};

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

interface RobotSectionState {
  controlHubs: boolean;
  expansionHubs: boolean;
  otherDevices: boolean;
}

export interface HubSectionState {
  motors: boolean;
  servos: boolean;
  i2cDevices: boolean;
  digitalDevices: boolean;
  analogInputDevices: boolean;
  customDevices: boolean;
}

export abstract class Device {
  public name = '';
  public port = 0;
  public type = '';
  public key = '';
  public abstract renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element;
}

export const motorType = {
  GoBILDA5201: 'goBILDA5201SeriesMotor',
  GoBILDA5202_3_4: 'goBILDA5202SeriesMotor',
  Matrix12v: 'Matrix12vMotor',
  NeveRest3_7V1: 'NeveRest3.7v1Gearmotor',
  NeveRest20: 'NeveRest20Gearmotor',
  NeveRest40: 'NeveRest40Gearmotor',
  NeverRest60: 'NeveRest60Gearmotor',
  REV20HDHex: 'RevRobotics20HDHexMotor',
  REV40HDHex: 'RevRobotics40HDHexMotor',
  REVCoreHex: 'RevRoboticsCoreHexMotor',
  REVUltraplanetary: 'RevRoboticsUltraplanetaryHDHexMotor',
  Tetrix: 'TetrixMotor',
  Generic: 'Motor',
};

export const servoType = {
  CRServo: 'ContinuousRotationServo',
  Servo: 'Servo',
  SPARKMini: 'RevSPARKMini',
  REVBlinkin: 'RevBlinkinLedDriver',
};

export const analogType = {
  OpticalDistanceSensor: 'OpticalDistanceSensor',
  MRAnalogTouchSensor: 'ModernRoboticsAnalogTouchSensor',
  AnalogDevice: 'AnalogDevice',
  AnalogInput: 'AnalogInput',
};

export const digitalType = {
  REVTouch: 'RevTouchSensor',
  LED: 'Led',
  DigitalDevice: 'DigitalDevice',
};

export const i2cType = {
  AdafruitBNO055: 'AdafruitBNO055IMU',
  HuskyLens: 'HuskyLens',
  OctoQuad: 'OctoQuadFTC',
  NavXMicro: 'KauaiLabsNavxMicro',
  MaxSonar: 'MaxSonarI2CXL',
  MRCompas: 'ModernRoboticsI2cCompassSensor',
  MRRangeSensor: 'ModernRoboticsI2cRangeSensor',
  REV2MDistanceSensor: 'REV_VL53L0X_RANGE_SENSOR',
  REV9AxisIMU: 'RevExternalImu',
  REVColorSensorv3: 'RevColorSensorV3',
  SparkFunLEDStick: 'QWIIC_LED_STICK',
  SparkFunOTOS: 'SparkFunOTOS',
  LynxEmbeddedIMU: 'LynxEmbeddedIMU',
  goBILDAPinpointRR: 'goBILDAPinpointRR',
};

const renderStandardDevice = (
  device: Device,
  typeObj: Record<string, string>,
  configChangeCallback: () => void,
  keyPrefix: string,
  onDelete?: () => void,
  extra?: JSX.Element | null,
): JSX.Element => {
  let max: number | undefined;
  if (typeObj === motorType) max = maxDevices.motors - 1;
  if (typeObj === servoType) max = maxDevices.servos - 1;
  if (typeObj === analogType) max = maxDevices.analogInputDevices - 1;
  if (typeObj === digitalType) max = maxDevices.digitalDevices - 1;
  return (
    <div
      key={keyPrefix}
      className="
        relative
        my-2 rounded-md border border-gray-200
        bg-gray-50 p-3
        transition-colors dark:border-gray-600 dark:bg-gray-700
        dark:text-gray-100
      "
    >
      {onDelete && (
        <button
          className="
            absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md border
            border-red-400 bg-red-200 text-red-600
          "
          onClick={onDelete}
        >
          <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
        </button>
      )}
      <div className="space-y-1">
        <div>
          <label className="mr-1 text-sm">Name:</label>
          <input
            className="
              ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
            "
            type="text"
            value={device.name}
            onChange={(e) => {
              device.name = e.target.value;
              configChangeCallback();
            }}
          />
        </div>
        <div>
          <label className="mr-1 text-sm">Type:</label>
          <select
            className="
              ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
            "
            value={device.type}
            onChange={(e) => {
              device.type = e.target.value;
              device.key = e.target.value;
              configChangeCallback();
            }}
          >
            {Object.entries(typeObj).map(([display, xml]) => (
              <option key={xml} value={xml}>
                {display}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-1 text-sm">Port:</label>
          <input
            className="
              ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
            "
            type="number"
            value={isNaN(device.port) ? '' : device.port}
            onChange={(e) => {
              device.port = max
                ? clamp(parseInt(e.target.value, 10), 0, max)
                : parseInt(e.target.value, 10);
              configChangeCallback();
            }}
          />
        </div>
        {extra}
      </div>
    </div>
  );
};

export class Motor extends Device {
  constructor() {
    super();
    this.type = motorType.Generic;
    this.key = motorType.Generic;
  }
  public override toString() {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return renderStandardDevice(
      this,
      motorType,
      configChangeCallback,
      keyPrefix,
      onDelete,
    );
  }
}

export class Servo extends Device {
  constructor() {
    super();
    this.type = servoType.Servo;
    this.key = servoType.Servo;
  }
  public override toString() {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return renderStandardDevice(
      this,
      servoType,
      configChangeCallback,
      keyPrefix,
      onDelete,
    );
  }
}

export class Analog extends Device {
  constructor() {
    super();
    this.type = analogType.AnalogDevice;
    this.key = analogType.AnalogDevice;
  }
  public override toString() {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return renderStandardDevice(
      this,
      analogType,
      configChangeCallback,
      keyPrefix,
      onDelete,
    );
  }
}

export class Digital extends Device {
  constructor() {
    super();
    this.type = digitalType.DigitalDevice;
    this.key = digitalType.DigitalDevice;
  }
  public override toString() {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return renderStandardDevice(
      this,
      digitalType,
      configChangeCallback,
      keyPrefix,
      onDelete,
    );
  }
}

export class I2c extends Device {
  public bus = 0;
  constructor() {
    super();
    this.type = i2cType.AdafruitBNO055;
    this.key = i2cType.AdafruitBNO055;
  }
  public override toString() {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" bus="${isNaN(this.bus) ? 0 : this.bus}" />`;
  }
  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    const busField = (
      <div>
        <label className="mr-1 text-sm">Bus:</label>
        <input
          className="
            ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
            transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
          "
          type="number"
          value={isNaN(this.bus) ? '' : this.bus}
          onChange={(e) => {
            this.bus = parseInt(e.target.value, 10);
            configChangeCallback();
          }}
        />
      </div>
    );
    return renderStandardDevice(
      this,
      i2cType,
      configChangeCallback,
      keyPrefix,
      onDelete,
      busField,
    );
  }
}

export class EthernetDevice extends Device {
  public serialNumber = '';
  public ipAddress = '';
  constructor() {
    super();
    this.type = 'EthernetDevice';
    this.key = 'EthernetDevice';
  }
  public override toString() {
    return `<${this.key} name="${this.name}" serialNumber="${
      this.serialNumber
    }" port="${isNaN(this.port) ? 0 : this.port}" ipAddress="${
      this.ipAddress
    }" />`;
  }
  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return (
      <div
        key={keyPrefix}
        className="
          relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3
          transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
        "
      >
        {onDelete && (
          <button
            className="
              absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md border
              border-red-400 bg-red-200 text-red-600
            "
            onClick={onDelete}
          >
            <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
          </button>
        )}
        <div className="space-y-1">
          <label className="mr-1 text-sm">{this.type}:</label>
          <div>
            <label className="mr-1 text-sm">Name:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="text"
              value={this.name}
              onChange={(e) => {
                this.name = e.target.value;
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">Port:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="number"
              value={isNaN(this.port) ? '' : this.port}
              onChange={(e) => {
                this.port = parseInt(e.target.value, 10);
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">Serial:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="text"
              value={this.serialNumber}
              onChange={(e) => {
                this.serialNumber = e.target.value;
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">IP Address:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="text"
              value={this.ipAddress}
              onChange={(e) => {
                this.ipAddress = e.target.value;
                configChangeCallback();
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}

export class Webcam extends Device {
  public serialNumber = '';
  constructor() {
    super();
    this.type = 'Webcam';
    this.key = 'Webcam';
  }
  public override toString() {
    return `<${this.key} name="${this.name}" serialNumber="${this.serialNumber}" />`;
  }
  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return (
      <div
        key={keyPrefix}
        className="
          relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3
          transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
        "
      >
        {onDelete && (
          <button
            className="
              absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md border
              border-red-400 bg-red-200 text-red-600
            "
            onClick={onDelete}
          >
            <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
          </button>
        )}
        <div className="space-y-1">
          <label className="mr-1 text-sm">{this.type}:</label>
          <div>
            <label className="mr-1 text-sm">Name:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="text"
              value={this.name}
              onChange={(e) => {
                this.name = e.target.value;
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">Serial:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="text"
              value={this.serialNumber}
              onChange={(e) => {
                this.serialNumber = e.target.value;
                configChangeCallback();
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}

export class CustomDevice extends Device {
  constructor(public key: string) {
    super();
    this.type = key;
    this.name = key;
  }
  public override toString() {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return (
      <div
        key={keyPrefix}
        className="
          relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3
          transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
        "
      >
        {onDelete && (
          <button
            className="
              absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md border
              border-red-400 bg-red-200 text-red-600
            "
            onClick={onDelete}
          >
            <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
          </button>
        )}
        <div className="space-y-1">
          <div>
            <label className="mr-1 text-sm">Name:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="text"
              value={this.name}
              onChange={(e) => {
                this.name = e.target.value;
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">Type:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="text"
              value={this.key}
              onChange={(e) => {
                const newValue = e.target.value;
                this.key = newValue;
                this.type = newValue;
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">Port:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="number"
              value={isNaN(this.port) ? '' : this.port}
              onChange={(e) => {
                this.port = parseInt(e.target.value, 10);
                configChangeCallback();
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}

export abstract class Hub extends Device {
  public motors: Motor[] = [];
  public servos: Servo[] = [];
  public i2cDevices: I2c[] = [];
  public digitalDevices: Digital[] = [];
  public analogInputDevices: Analog[] = [];
  public customDevices: CustomDevice[] = [];
  public collapsedSections: HubSectionState;

  constructor() {
    super();
    this.collapsedSections = {
      motors: false,
      servos: false,
      i2cDevices: false,
      digitalDevices: false,
      analogInputDevices: false,
      customDevices: false,
    };
  }

  public override toString(): string {
    const lines: string[] = [
      `<${this.key} name="${this.name}" port="${
        isNaN(this.port) ? 0 : this.port
      }">`,
    ];
    const addSection = (title: string, devs: Device[]) => {
      if (devs.length) {
        lines.push(`    <!-- ${title} -->`);
        devs.forEach((d) =>
          d
            .toString()
            .split('\n')
            .forEach((l) => lines.push(`    ${l}`)),
        );
      }
    };
    addSection('Motors', this.motors);
    addSection('Servos', this.servos);
    addSection('I2C Devices', this.i2cDevices);
    addSection('Digital Devices', this.digitalDevices);
    addSection('Analog Inputs', this.analogInputDevices);
    addSection('Custom Devices', this.customDevices);
    lines.push(`</${this.key}>`);
    return lines.join('\n');
  }

  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    const renderCollapsibleSection = (
      name: keyof HubSectionState,
      title: string,
      devs: Device[],
      addCb: () => void,
      renderCb: (d: Device, i: number) => JSX.Element,
      canAdd: boolean,
    ) => {
      const collapsed = this.collapsedSections[name];
      return (
        <div>
          <div
            className="flex items-center justify-between border-b p-1"
            onClick={() => {
              this.collapsedSections[name] = !collapsed;
              configChangeCallback();
            }}
          >
            <div className="flex items-center">
              <h5 className="m-1 text-sm">
                {title} ({devs.length})
              </h5>
              <button
                className={`ml-1 flex h-6 w-6 items-center justify-center rounded-md font-medium ${
                  canAdd
                    ? 'border border-green-600 bg-green-200 text-green-600'
                    : 'bg-gray-200 text-gray-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (collapsed) this.collapsedSections[name] = false;
                  addCb();
                }}
                disabled={!canAdd}
              >
                +
              </button>
            </div>

            <button className="bg-transparent p-0">
              <ExpandMore
                className={`
                  ${collapsed ? '-rotate-90' : 'rotate-0'}
                  h-4 w-4 transition-transform
                `}
              />
            </button>
          </div>

          {!collapsed && <>{devs.map((d, i) => renderCb(d, i))}</>}
        </div>
      );
    };

    return (
      <div
        key={keyPrefix}
        className="
          relative m-4 rounded-lg border border-gray-300 bg-white p-4
          transition-colors dark:border-gray-700 dark:bg-gray-800
          dark:text-gray-100
        "
      >
        <h4 className="flex items-center">
          <label className="mr-1 text-sm">Hub Name:</label>
          <input
            className="
              ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
            "
            type="text"
            value={this.name}
            onChange={(e) => {
              this.name = e.target.value;
              configChangeCallback();
            }}
          />
          <label className="ml-1 mr-1 text-sm">Port:</label>
          <input
            className="
              ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
            "
            type="number"
            value={isNaN(this.port) ? '' : this.port}
            onChange={(e) => {
              this.port = parseInt(e.target.value, 10);
              configChangeCallback();
            }}
          />
          ({this.type})
          {onDelete && (
            <button
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border
              border-red-400 bg-red-200 text-red-600"
              onClick={onDelete}
            >
              <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
            </button>
          )}
        </h4>

        {renderCollapsibleSection(
          'motors',
          'Motors',
          this.motors,
          () => {
            this.motors.push(new Motor());
            configChangeCallback();
          },
          (m, i) =>
            m.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-motor-${i}`,
              () => {
                this.motors.splice(i, 1);
                configChangeCallback();
              },
            ),
          this.motors.length < maxDevices.motors,
        )}

        {renderCollapsibleSection(
          'servos',
          'Servos',
          this.servos,
          () => {
            this.servos.push(new Servo());
            configChangeCallback();
          },
          (s, i) =>
            s.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-servo-${i}`,
              () => {
                this.servos.splice(i, 1);
                configChangeCallback();
              },
            ),
          this.servos.length < maxDevices.servos,
        )}

        {renderCollapsibleSection(
          'i2cDevices',
          'I2C Devices',
          this.i2cDevices,
          () => {
            this.i2cDevices.push(new I2c());
            configChangeCallback();
          },
          (i, idx) =>
            i.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-i2c-${idx}`,
              () => {
                this.i2cDevices.splice(idx, 1);
                configChangeCallback();
              },
            ),
          true,
        )}

        {renderCollapsibleSection(
          'analogInputDevices',
          'Analog Inputs',
          this.analogInputDevices,
          () => {
            this.analogInputDevices.push(new Analog());
            configChangeCallback();
          },
          (a, i) =>
            a.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-analog-${i}`,
              () => {
                this.analogInputDevices.splice(i, 1);
                configChangeCallback();
              },
            ),
          this.analogInputDevices.length < maxDevices.analogInputDevices,
        )}

        {renderCollapsibleSection(
          'digitalDevices',
          'Digital Devices',
          this.digitalDevices,
          () => {
            this.digitalDevices.push(new Digital());
            configChangeCallback();
          },
          (d, i) =>
            d.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-digital-${i}`,
              () => {
                this.digitalDevices.splice(i, 1);
                configChangeCallback();
              },
            ),
          this.digitalDevices.length < maxDevices.digitalDevices,
        )}

        {renderCollapsibleSection(
          'customDevices',
          'Custom Devices',
          this.customDevices,
          () => {
            const tag = '';
            this.customDevices.push(new CustomDevice(tag));
            configChangeCallback();
          },
          (c, i) =>
            c.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-custom-${i}`,
              () => {
                this.customDevices.splice(i, 1);
                configChangeCallback();
              },
            ),
          true,
        )}
      </div>
    );
  }
}

export class ControlHub extends Hub {
  constructor() {
    super();
    this.name = 'Control Hub';
    this.port = 173;
    this.type = 'ControlHub';
    this.key = 'LynxModule';
  }
}

export class ExpansionHub extends Hub {
  constructor() {
    super();
    this.name = 'Expansion Hub';
    this.port = 1;
    this.type = 'ExpansionHub';
    this.key = 'LynxModule';
  }
}

export class Custom extends Hub {
  public attributes: Array<{ key: string; val: string }> = [];

  constructor(tagName = 'CustomHub') {
    super();
    this.key = tagName;
    this.type = tagName;
    this.name = tagName;
    this.attributes.push({ key: 'name', val: this.name });
  }

  public override toString() {
    const attrStr = this.attributes
      .map(({ key, val }) => `${key}="${val}"`)
      .join(' ');
    return attrStr.length > 0
      ? `<${this.key} ${attrStr} />`
      : `<${this.key} />`;
  }

  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return (
      <div
        key={keyPrefix}
        className="
          relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3
          transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
        "
      >
        {onDelete && (
          <button
            className="
              absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md border
              border-red-400 bg-red-200 text-red-600
            "
            onClick={onDelete}
          >
            <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
          </button>
        )}
        <div className="space-y-2">
          <div>
            <label className="mr-1 text-sm">Type:</label>
            <input
              className="
                ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
              "
              type="text"
              value={this.key}
              onChange={(e) => {
                this.key = e.target.value;
                this.type = e.target.value;
                this.name = e.target.value;
                configChangeCallback();
              }}
            />
          </div>

          {this.attributes.map(({ key, val }, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <input
                className="
                  flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                  transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                "
                type="text"
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  this.attributes = this.attributes.map((a, i) =>
                    i === idx ? { ...a, key: newKey } : a,
                  );
                  configChangeCallback();
                }}
              />
              <input
                className="
                  flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm
                  transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                "
                type="text"
                value={val}
                onChange={(e) => {
                  const newVal = e.target.value;
                  this.attributes = this.attributes.map((a, i) =>
                    i === idx ? { ...a, val: newVal } : a,
                  );
                  configChangeCallback();
                }}
              />
              <button
                className="
                  flex h-6 w-6 items-center justify-center rounded-md border
                  border-red-400 bg-red-200 text-red-600
                "
                onClick={() => {
                  this.attributes = this.attributes.filter((_, i) => i !== idx);
                  configChangeCallback();
                }}
              >
                <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
              </button>
            </div>
          ))}

          <button
            className="
              flex h-6 w-6 items-center justify-center rounded-md border
              border-green-600 bg-green-200 text-green-600
            "
            onClick={() => {
              this.attributes.push({ key: '', val: '' });
              configChangeCallback();
            }}
          >
            +
          </button>
        </div>
      </div>
    );
  }
}
export class Robot {
  public controlHubs: ControlHub[] = [];
  public expansionHubs: ExpansionHub[] = [];
  public otherDevices: Device[] = [];
  public name: string;
  public collapsedSections: RobotSectionState;

  constructor() {
    this.name = 'Control Hub Portal';
    this.collapsedSections = {
      controlHubs: false,
      expansionHubs: false,
      otherDevices: false,
    };
  }

  public toString(): string {
    const lines: string[] = [];
    lines.push(`<Robot type="FirstInspires-FTC">`);
    if (this.controlHubs.length || this.expansionHubs.length) {
      lines.push(
        `    <LynxUsbDevice name="${this.name}" parentModuleAddress="173" serialNumber="(embedded)">`,
      );
      for (const hub of [...this.controlHubs, ...this.expansionHubs]) {
        hub
          .toString()
          .split('\n')
          .forEach((line) =>
            lines.push(line && line.trim() ? `        ${line}` : ''),
          );
      }
      lines.push(`    </LynxUsbDevice>`);
    }
    for (const device of this.otherDevices) {
      lines.push(`    ${device.toString()}`);
    }
    lines.push(`</Robot>`);
    return lines.join('\n');
  }

  public fromXml(xmlString: string): void {
    this.controlHubs = [];
    this.expansionHubs = [];
    this.otherDevices = [];
    this.name = 'Control Hub Portal';
    this.collapsedSections = {
      controlHubs: false,
      expansionHubs: false,
      otherDevices: false,
    };

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    const robotElement = xmlDoc.getElementsByTagName('Robot')[0];
    if (!robotElement) return;

    const getAttr = (
      el: Element,
      name: string,
      def?: string | null,
    ): string | null => el.getAttribute(name) ?? def ?? null;

    const lynxUsbDeviceElement =
      robotElement.getElementsByTagName('LynxUsbDevice')[0];
    if (lynxUsbDeviceElement) {
      this.name = getAttr(lynxUsbDeviceElement, 'name') ?? this.name;
    }

    const createDeviceInstance = (
      element: Element,
      category: 'Motor' | 'Servo' | 'Analog' | 'Digital' | 'I2c',
    ): Device => {
      let device: Device;
      switch (category) {
        case 'Motor':
          device = new Motor();
          break;
        case 'Servo':
          device = new Servo();
          break;
        case 'Analog':
          device = new Analog();
          break;
        case 'Digital':
          device = new Digital();
          break;
        case 'I2c':
          device = new I2c();
          break;
        default:
          throw new Error(`Unknown device category: ${category}`);
      }
      device.name = getAttr(element, 'name') ?? '';
      device.port = parseInt(getAttr(element, 'port') ?? '0', 10);
      device.key = element.tagName;
      device.type = element.tagName;
      if (device instanceof I2c) {
        device.bus = parseInt(getAttr(element, 'bus') ?? '0', 10);
      }
      return device;
    };

    for (const child of Array.from(robotElement.children)) {
      if (child.tagName === 'LynxUsbDevice') {
        for (const moduleNode of Array.from(child.children)) {
          if (moduleNode.tagName === 'LynxModule') {
            const module = moduleNode as Element;
            const name = getAttr(module, 'name');
            const port = parseInt(getAttr(module, 'port') ?? '0', 10);
            const isControlHub =
              name?.toLowerCase().includes('control hub') || port === 173;
            const isCustomHub =
              name?.toLowerCase().includes('custom hub') ||
              (name?.toLowerCase().includes('custom') &&
                !isControlHub &&
                port !== 173);
            let hub: Hub;
            if (isControlHub) {
              hub = new ControlHub();
              this.controlHubs.push(hub as ControlHub);
            } else if (isCustomHub) {
              hub = new Custom(name ?? 'Custom Hub');
              this.otherDevices.push(hub as Custom);
            } else {
              hub = new ExpansionHub();
              this.expansionHubs.push(hub as ExpansionHub);
            }
            hub.name = name ?? hub.name;
            hub.port = port || hub.port;
            for (const deviceEl of Array.from(module.children)) {
              if (deviceEl.nodeType !== Node.ELEMENT_NODE) continue;
              const tag = deviceEl.tagName;
              if (Object.values(motorType).includes(tag as string)) {
                const motor = createDeviceInstance(deviceEl, 'Motor') as Motor;
                hub.motors.push(motor);
              } else if (Object.values(servoType).includes(tag as string)) {
                const servo = createDeviceInstance(deviceEl, 'Servo') as Servo;
                hub.servos.push(servo);
              } else if (Object.values(i2cType).includes(tag as string)) {
                const i2c = createDeviceInstance(deviceEl, 'I2c') as I2c;
                hub.i2cDevices.push(i2c);
              } else if (Object.values(analogType).includes(tag as string)) {
                const analog = createDeviceInstance(
                  deviceEl,
                  'Analog',
                ) as Analog;
                hub.analogInputDevices.push(analog);
              } else if (Object.values(digitalType).includes(tag as string)) {
                const digital = createDeviceInstance(
                  deviceEl,
                  'Digital',
                ) as Digital;
                hub.digitalDevices.push(digital);
              } else {
                const custom = new CustomDevice(tag);
                for (const attr of Array.from(deviceEl.attributes)) {
                  (custom as CustomDevice & Record<string, string>)[attr.name] =
                    attr.value;
                }
                custom.port = parseInt(getAttr(deviceEl, 'port') ?? '0', 10);
                hub.customDevices.push(custom);
              }
            }
          }
        }
      } else if (
        child.tagName === 'EthernetDevice' ||
        child.tagName === 'Webcam'
      ) {
        const DeviceClass =
          child.tagName === 'EthernetDevice' ? EthernetDevice : Webcam;
        const d = new DeviceClass();
        d.name = getAttr(child, 'name') ?? '';
        if (d instanceof EthernetDevice) {
          d.serialNumber = getAttr(child, 'serialNumber') ?? '';
          d.port = parseInt(getAttr(child, 'port') ?? '0', 10);
          d.ipAddress = getAttr(child, 'ipAddress') ?? '';
        } else {
          d.serialNumber = getAttr(child, 'serialNumber') ?? '';
        }
        this.otherDevices.push(d);
      } else if (
        child.tagName !== 'EthernetDevice' &&
        child.tagName !== 'Webcam'
      ) {
        const tagName = child.tagName;
        const hub = new Custom(tagName);
        hub.name = child.getAttribute('name') ?? tagName;
        hub.attributes = hub.attributes.map((a) =>
          a.key === 'name' ? { ...a, val: hub.name } : a,
        );
        for (const attr of Array.from(child.attributes)) {
          if (attr.name === 'name') continue;
          hub.attributes.push({ key: attr.name, val: attr.value });
        }
        if (tagName.toLowerCase().includes('control hub')) {
          this.controlHubs.push(hub as unknown as ControlHub);
        } else if (tagName.toLowerCase().includes('expansion hub')) {
          this.expansionHubs.push(hub as unknown as ExpansionHub);
        } else {
          this.otherDevices.push(hub as Custom);
        }
        continue;
      }
    }
  }

  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
  ): JSX.Element {
    const canAddControlHub = this.controlHubs.length >= maxDevices.controlHubs;
    const canAddExpansionHub =
      this.expansionHubs.length >= maxDevices.expansionHubs;

    const isControlHubsCollapsed = this.collapsedSections.controlHubs;
    const isExpansionHubsCollapsed = this.collapsedSections.expansionHubs;
    const isOtherDevicesCollapsed = this.collapsedSections.otherDevices;

    return (
      <div key={keyPrefix} className="font-sans">
        <label className="mr-1 text-sm">Control Hub Portal Name:</label>
        <input
          className="ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          type="text"
          value={this.name}
          onChange={(e) => {
            this.name = e.target.value;
            configChangeCallback();
          }}
        />

        {/* Control Hubs */}
        <div>
          <div
            className="flex items-center justify-between border-b p-2"
            onClick={() => {
              this.collapsedSections.controlHubs = !isControlHubsCollapsed;
              configChangeCallback();
            }}
          >
            <div className="flex items-center">
              <h4 className="m-1 text-sm">
                Control Hubs ({this.controlHubs.length})
              </h4>
              <button
                className={`ml-1 flex h-6 w-6 items-center justify-center rounded-md font-medium ${
                  !canAddControlHub
                    ? 'border border-green-600 bg-green-200 text-green-600'
                    : 'bg-gray-200 text-gray-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isControlHubsCollapsed)
                    this.collapsedSections.controlHubs = false;
                  this.controlHubs.push(new ControlHub());
                  configChangeCallback();
                }}
                disabled={canAddControlHub}
              >
                +
              </button>
            </div>

            <button className="bg-transparent p-0">
              <ExpandMore
                className={`${
                  isControlHubsCollapsed ? '-rotate-90' : 'rotate-0'
                } h-4  w-4 transition-transform`}
              />
            </button>
          </div>

          {!isControlHubsCollapsed &&
            this.controlHubs.map((hub, index) =>
              hub.renderAsGui(
                configChangeCallback,
                `${keyPrefix}-ch-${index}`,
                () => {
                  this.controlHubs.splice(index, 1);
                  configChangeCallback();
                },
              ),
            )}
        </div>
        <hr />

        {/* Expansion Hubs */}
        <div>
          <div
            className="flex items-center justify-between border-b p-2"
            onClick={() => {
              this.collapsedSections.expansionHubs = !isExpansionHubsCollapsed;
              configChangeCallback();
            }}
          >
            <div className="flex items-center">
              <h4 className="m-1 text-sm">
                Expansion Hubs ({this.expansionHubs.length})
              </h4>
              <button
                className={`ml-1 flex h-6 w-6 items-center justify-center rounded-md font-medium ${
                  !canAddExpansionHub
                    ? 'border border-green-600 bg-green-200 text-green-600'
                    : 'bg-gray-200 text-gray-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isExpansionHubsCollapsed)
                    this.collapsedSections.expansionHubs = false;
                  this.expansionHubs.push(new ExpansionHub());
                  configChangeCallback();
                }}
                disabled={canAddExpansionHub}
              >
                +
              </button>
            </div>

            <button className="bg-transparent p-0">
              <ExpandMore
                className={`${
                  isExpansionHubsCollapsed ? '-rotate-90' : 'rotate-0'
                } h-4  w-4 transition-transform`}
              />
            </button>
          </div>

          {!isExpansionHubsCollapsed &&
            this.expansionHubs.map((hub, index) =>
              hub.renderAsGui(
                configChangeCallback,
                `${keyPrefix}-eh-${index}`,
                () => {
                  this.expansionHubs.splice(index, 1);
                  configChangeCallback();
                },
              ),
            )}
        </div>
        <hr />

        {/* Other Devices */}
        <div>
          <div
            className="flex items-center justify-between border-b p-2"
            onClick={() => {
              this.collapsedSections.otherDevices = !isOtherDevicesCollapsed;
              configChangeCallback();
            }}
          >
            <div className="flex items-center">
              <h4 className="m-1 text-sm">Other Devices</h4>
            </div>

            <button className="bg-transparent p-0">
              <ExpandMore
                className={`${
                  isOtherDevicesCollapsed ? '-rotate-90' : 'rotate-0'
                } h-4  w-4 transition-transform`}
              />
            </button>
          </div>

          <div className="flex items-center space-x-2 p-2">
            <span>
              Ethernet Device (
              {
                this.otherDevices.filter((d) => d instanceof EthernetDevice)
                  .length
              }
              )
            </span>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md border border-green-600 bg-green-200 font-medium text-green-600"
              onClick={(e) => {
                e.stopPropagation();
                this.otherDevices.push(new EthernetDevice());
                configChangeCallback();
              }}
            >
              +
            </button>

            <span>
              Webcam (
              {this.otherDevices.filter((d) => d instanceof Webcam).length})
            </span>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md border border-green-600 bg-green-200 font-medium text-green-600"
              onClick={(e) => {
                e.stopPropagation();
                this.otherDevices.push(new Webcam());
                configChangeCallback();
              }}
            >
              +
            </button>

            <span>Custom Device</span>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md border border-green-600 bg-green-200 font-medium text-green-600"
              onClick={(e) => {
                e.stopPropagation();
                this.otherDevices.push(new Custom());
                configChangeCallback();
              }}
            >
              +
            </button>
          </div>

          {!isOtherDevicesCollapsed &&
            this.otherDevices.map((device, index) =>
              device.renderAsGui(
                configChangeCallback,
                `${keyPrefix}-od-${index}`,
                () => {
                  this.otherDevices.splice(index, 1);
                  configChangeCallback();
                },
              ),
            )}
        </div>
      </div>
    );
  }
}