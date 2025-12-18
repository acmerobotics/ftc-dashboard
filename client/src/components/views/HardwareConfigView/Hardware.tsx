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
  public rawInnerText = '';
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
  NeveRest60: 'NeveRest60Gearmotor',
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
  goBILDAPinpoint: 'goBILDAPinpoint',
  SRSHub: 'SRSHub',
};

const typeCollections = {
  Motor: motorType,
  Servo: servoType,
  Analog: analogType,
  Digital: digitalType,
  I2c: i2cType,
};

const inputClasses =
  'ml-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

const DeleteButton = ({ onClick }: { onClick?: () => void }) => (
  <button
    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md border border-red-400 bg-red-200 text-red-600"
    onClick={onClick}
  >
    <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
  </button>
);

const Input = ({
  value,
  onChange,
  type = 'text',
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) => (
  <input
    className={inputClasses}
    type={type}
    value={value === undefined || value === null ? '' : String(value)}
    onChange={(e) => onChange(e.target.value)}
  />
);

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
      className="relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
    >
      {onDelete && <DeleteButton onClick={onDelete} />}
      <div className="space-y-1">
        <div>
          <label className="mr-1 text-sm">Name:</label>
          <Input
            value={device.name}
            onChange={(v) => {
              device.name = v;
              configChangeCallback();
            }}
          />
        </div>
        <div>
          <label className="mr-1 text-sm">Type:</label>
          <select
            className={inputClasses}
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
          <Input
            type="number"
            value={isNaN(device.port) ? '' : device.port}
            onChange={(v) => {
              const parsed = parseInt(v || '0', 10);
              device.port = max ? clamp(parsed, 0, max) : parsed;
              configChangeCallback();
            }}
          />
        </div>
        {extra}
      </div>
    </div>
  );
};

export class StandardDevice extends Device {
  private typeObj: Record<string, string>;
  constructor(defaultKey: string, typeObj: Record<string, string>) {
    super();
    this.type = defaultKey;
    this.key = defaultKey;
    this.typeObj = typeObj;
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
      this.typeObj,
      configChangeCallback,
      keyPrefix,
      onDelete,
    );
  }
}

export class Motor extends StandardDevice {
  constructor() {
    super(motorType.Generic, motorType);
  }
}

export class Servo extends StandardDevice {
  constructor() {
    super(servoType.Servo, servoType);
  }
}

export class Analog extends StandardDevice {
  constructor() {
    super(analogType.AnalogDevice, analogType);
  }
}

export class Digital extends StandardDevice {
  constructor() {
    super(digitalType.DigitalDevice, digitalType);
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
        <Input
          type="number"
          value={isNaN(this.bus) ? '' : this.bus}
          onChange={(v) => {
            this.bus = parseInt(v || '0', 10);
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
        className="relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        {onDelete && <DeleteButton onClick={onDelete} />}
        <div className="space-y-1">
          <label className="mr-1 text-sm">{this.type}:</label>
          <div>
            <label className="mr-1 text-sm">Name:</label>
            <Input
              value={this.name}
              onChange={(v) => {
                this.name = v;
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">Port:</label>
            <Input
              type="number"
              value={isNaN(this.port) ? '' : this.port}
              onChange={(v) => {
                this.port = parseInt(v || '0', 10);
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">Serial:</label>
            <Input
              value={this.serialNumber}
              onChange={(v) => {
                this.serialNumber = v;
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">IP Address:</label>
            <Input
              value={this.ipAddress}
              onChange={(v) => {
                this.ipAddress = v;
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
        className="relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        {onDelete && <DeleteButton onClick={onDelete} />}
        <div className="space-y-1">
          <label className="mr-1 text-sm">{this.type}:</label>
          <div>
            <label className="mr-1 text-sm">Name:</label>
            <Input
              value={this.name}
              onChange={(v) => {
                this.name = v;
                configChangeCallback();
              }}
            />
          </div>
          <div>
            <label className="mr-1 text-sm">Serial:</label>
            <Input
              value={this.serialNumber}
              onChange={(v) => {
                this.serialNumber = v;
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
  public attributes: Array<{ key: string; val: string }> = [];

  constructor(public key: string = 'Custom') {
    super();
    this.key = key;
    this.type = key;
    this.name = 'Custom Device';
  }

  private getNextAttributeKey(): string {
    const existing = this.attributes
      .map((a) => a.key)
      .filter((k) => k.startsWith('attr'))
      .map((k) => parseInt(k.replace('attr', ''), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `attr${next}`;
  }

  public override toString() {
    const attrStr = this.attributes
      .map(({ key, val }) => `${key}="${val}"`)
      .join(' ');
    return `<${this.key} ${attrStr} />`;
  }

  public override renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return (
      <div
        key={keyPrefix}
        className="relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        {onDelete && <DeleteButton onClick={onDelete} />}
        <div className="space-y-2">
          <div>
            <label className="mr-1 text-sm">Type:</label>
            <Input
              value={this.type}
              onChange={(v) => {
                this.type = v;
                this.key = v;
                configChangeCallback();
              }}
            />
          </div>

          {this.attributes.map(({ key, val }, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <Input
                value={key}
                onChange={(newKey) => {
                  this.attributes[idx].key = newKey;
                  configChangeCallback();
                }}
              />
              <Input
                value={val}
                onChange={(newVal) => {
                  this.attributes[idx].val = newVal;
                  if (key === 'name') {
                    this.name = newVal;
                  }
                  configChangeCallback();
                }}
              />
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md border border-red-400 bg-red-200 text-red-600"
                onClick={() => {
                  this.attributes.splice(idx, 1);
                  configChangeCallback();
                }}
              >
                <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
              </button>
            </div>
          ))}

          <button
            className="flex h-6 w-6 items-center justify-center rounded-md border border-green-600 bg-green-200 text-green-600"
            onClick={() => {
              const nextKey = this.getNextAttributeKey();
              this.attributes.push({ key: nextKey, val: '' });
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
                className={`${
                  collapsed ? '-rotate-90' : 'rotate-0'
                } h-4 w-4 transition-transform`}
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
        className="relative m-4 rounded-lg border border-gray-300 bg-white p-4 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      >
        <h4 className="flex items-center">
          <label className="mr-1 text-sm">Hub Name:</label>
          <Input
            value={this.name}
            onChange={(v) => {
              this.name = v;
              configChangeCallback();
            }}
          />
          <label className="ml-1 mr-1 text-sm">Port:</label>
          <Input
            type="number"
            value={isNaN(this.port) ? '' : this.port}
            onChange={(v) => {
              this.port = parseInt(v || '0', 10);
              configChangeCallback();
            }}
          />
          {onDelete && (
            <button
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border border-red-400 bg-red-200 text-red-600"
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
            const tag = 'Custom';
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

  constructor(tagName = 'CustomDevice', type = 'Custom') {
    super();
    this.key = tagName;
    this.type = type;
    this.name = 'Custom Device';
  }

  private getNextAttributeKey(): string {
    const existing = this.attributes
      .map((a) => a.key)
      .filter((k) => k.startsWith('attr'))
      .map((k) => parseInt(k.replace('attr', ''), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `attr${next}`;
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
        className="relative my-2 rounded-md border border-gray-200 bg-gray-50 p-3 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        {onDelete && <DeleteButton onClick={onDelete} />}
        <div className="space-y-2">
          <div>
            <label className="mr-1 text-sm">Type:</label>
            <Input
              value={this.type}
              onChange={(v) => {
                this.type = v;
                this.key = v;
                configChangeCallback();
              }}
            />
          </div>

          {this.attributes.map(({ key, val }, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <Input
                value={key}
                onChange={(newKey) => {
                  this.attributes[idx].key = newKey;
                  configChangeCallback();
                }}
              />
              <Input
                value={val}
                onChange={(newVal) => {
                  this.attributes[idx].val = newVal;
                  configChangeCallback();
                }}
              />
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md border border-red-400 bg-red-200 text-red-600"
                onClick={() => {
                  this.attributes.splice(idx, 1);
                  configChangeCallback();
                }}
              >
                <RemoveCircleOutline className="h-5 w-5 fill-red-800" />
              </button>
            </div>
          ))}

          <button
            className="flex h-6 w-6 items-center justify-center rounded-md border border-green-600 bg-green-200 text-green-600"
            onClick={() => {
              const nextKey = this.getNextAttributeKey();
              this.attributes.push({ key: nextKey, val: '' });
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
    lines.push(
      `    <LynxUsbDevice name="${this.name}" parentModuleAddress="173" serialNumber="(embedded)">`,
    );
    if (this.controlHubs.length || this.expansionHubs.length) {
      for (const hub of [...this.controlHubs, ...this.expansionHubs]) {
        hub
          .toString()
          .split('\n')
          .forEach((line) =>
            lines.push(line && line.trim() ? `        ${line}` : ''),
          );
      }
    }
    lines.push(`    </LynxUsbDevice>`);
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
    this.collapsedSections = {
      controlHubs: false,
      expansionHubs: false,
      otherDevices: false,
    };

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    const robotElement = xmlDoc.getElementsByTagName('Robot')[0];
    if (!robotElement) return;

    this.name = robotElement.getAttribute('name') || 'Control Hub Portal';

    const getAttr = (el: Element, name: string, def = ''): string =>
      el.getAttribute(name) ?? def;

    const lynxUsbDeviceElement =
      robotElement.getElementsByTagName('LynxUsbDevice')[0];
    if (lynxUsbDeviceElement) {
      this.name = getAttr(lynxUsbDeviceElement, 'name') || this.name;

      for (const moduleNode of Array.from(lynxUsbDeviceElement.children)) {
        if (moduleNode.tagName !== 'LynxModule') continue;

        const port = parseInt(getAttr(moduleNode, 'port', '0'), 10);
        let hub: Hub;
        if (port === 173) {
          hub = new ControlHub();
          this.controlHubs.push(hub as ControlHub);
        } else {
          hub = new ExpansionHub();
          this.expansionHubs.push(hub as ExpansionHub);
        }

        hub.name = getAttr(moduleNode, 'name', hub.name);
        hub.port = port;
        hub.rawInnerText = moduleNode.textContent?.trim() || '';

        for (const deviceEl of Array.from(moduleNode.children)) {
          if (deviceEl.nodeType !== Node.ELEMENT_NODE) continue;
          const tag = deviceEl.tagName;
          const category = Object.keys(typeCollections).find((k) =>
            Object.values(
              typeCollections[k as keyof typeof typeCollections],
            ).includes(tag),
          ) as keyof typeof typeCollections | undefined;

          let dev: Device;
          if (category) {
            switch (category) {
              case 'Motor':
                dev = new Motor();
                break;
              case 'Servo':
                dev = new Servo();
                break;
              case 'Analog':
                dev = new Analog();
                break;
              case 'Digital':
                dev = new Digital();
                break;
              case 'I2c':
                dev = new I2c();
                break;
              default:
                dev = new CustomDevice(tag);
                break;
            }
            dev.name = getAttr(deviceEl, 'name', dev.name);
            if (deviceEl.hasAttribute('port'))
              dev.port = parseInt(
                getAttr(deviceEl, 'port', String(dev.port || 0)),
                10,
              );
            dev.key = tag;
            dev.type = tag;
            dev.rawInnerText = deviceEl.textContent?.trim() || '';

            if (dev instanceof I2c && deviceEl.hasAttribute('bus'))
              (dev as I2c).bus = parseInt(
                getAttr(deviceEl, 'bus', String((dev as I2c).bus || 0)),
                10,
              );

            if (category === 'Motor') hub.motors.push(dev as Motor);
            else if (category === 'Servo') hub.servos.push(dev as Servo);
            else if (category === 'Analog')
              hub.analogInputDevices.push(dev as Analog);
            else if (category === 'Digital')
              hub.digitalDevices.push(dev as Digital);
            else if (category === 'I2c') hub.i2cDevices.push(dev as I2c);
          } else {
            const custom = new CustomDevice(tag);
            custom.key = tag;
            custom.type = tag;
            custom.rawInnerText = deviceEl.textContent?.trim() || '';

            for (const attr of Array.from(deviceEl.attributes)) {
              custom.attributes.push({
                key: attr.name || 'unknown',
                val: attr.value,
              });
              if (attr.name === 'name') {
                custom.name = attr.value;
              } else if (attr.name === 'port') {
                const p = parseInt(attr.value, 10);
                if (!isNaN(p)) custom.port = p;
              }
            }
            hub.customDevices.push(custom);
          }
        }
      }
    }

    for (const child of Array.from(robotElement.children)) {
      if (child.tagName === 'LynxUsbDevice') continue;

      const tagName = child.tagName;
      if (tagName === 'EthernetDevice') {
        const device = new EthernetDevice();
        device.name = getAttr(child, 'name', '');
        device.serialNumber = getAttr(child, 'serialNumber', '');
        device.ipAddress = getAttr(child, 'ipAddress', '');
        if (child.hasAttribute('port'))
          device.port = parseInt(getAttr(child, 'port', '0'), 10);
        device.rawInnerText = child.textContent?.trim() || '';
        this.otherDevices.push(device);
      } else if (tagName === 'Webcam') {
        const device = new Webcam();
        device.name = getAttr(child, 'name', '');
        device.serialNumber = getAttr(child, 'serialNumber', '');
        device.rawInnerText = child.textContent?.trim() || '';
        this.otherDevices.push(device);
      } else {
        const parsedType = child.getAttribute('type') || tagName;
        const customHub = new Custom(tagName, parsedType);
        customHub.name = getAttr(child, 'name', 'CustomDevice');
        customHub.rawInnerText = child.textContent?.trim() || '';
        for (const attr of Array.from(child.attributes)) {
          customHub.attributes.push({
            key: attr.name || 'unknown',
            val: attr.value,
          });
          if (attr.name === 'port') {
            const p = parseInt(attr.value, 10);
            if (!isNaN(p)) customHub.port = p;
          }
        }
        if (!customHub.type) customHub.type = tagName;
        this.otherDevices.push(customHub);
      }
    }
  }

  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
  ): JSX.Element {
    const canAddControlHub = this.controlHubs.length < maxDevices.controlHubs;
    const canAddExpansionHub =
      this.expansionHubs.length < maxDevices.expansionHubs;

    const isControlHubsCollapsed = this.collapsedSections.controlHubs;
    const isExpansionHubsCollapsed = this.collapsedSections.expansionHubs;
    const isOtherDevicesCollapsed = this.collapsedSections.otherDevices;

    return (
      <div key={keyPrefix} className="font-sans">
        <label className="mr-1 text-sm">Control Hub Portal Name:</label>
        <Input
          value={this.name}
          onChange={(v) => {
            this.name = v;
            configChangeCallback();
          }}
        />

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
                  canAddControlHub
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
                disabled={!canAddControlHub}
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
                  canAddExpansionHub
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
                disabled={!canAddExpansionHub}
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
                if (this.collapsedSections.otherDevices)
                  this.collapsedSections.otherDevices = false;
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
                if (this.collapsedSections.otherDevices)
                  this.collapsedSections.otherDevices = false;
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
                const newCustomHub = new Custom();
                newCustomHub.attributes.push({
                  key: 'name',
                  val: newCustomHub.name,
                });
                if (this.collapsedSections.otherDevices)
                  this.collapsedSections.otherDevices = false;
                this.otherDevices.push(newCustomHub);
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

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.name || this.name.trim() === '') {
      errors.push('Control Hub Portal Name cannot be empty.');
    }

    const isInt = (n: unknown): n is number => Number.isInteger(n);
    const inRange = (n: number, min: number, max: number) =>
      isInt(n) && n >= min && n <= max;

    const checkDuplicatePorts = (
      devices: Device[],
      typeName: string,
      hubName: string,
    ) => {
      const portMap: Record<number, string[]> = {};
      devices.forEach((d) => {
        if (!portMap[d.port]) portMap[d.port] = [];
        portMap[d.port].push(d.name || '(unnamed)');
      });
      for (const port in portMap) {
        if (portMap[port].length > 1) {
          errors.push(
            `Duplicate ${typeName} port ${port} in hub "${hubName}": ${portMap[
              port
            ].join(', ')}`,
          );
        }
      }
    };

    const checkDuplicateNames = (
      devices: Device[],
      typeName: string,
      hubName: string,
    ) => {
      const nameMap: Record<string, number[]> = {};
      devices.forEach((d, idx) => {
        const name = d.name || '(unnamed)';
        if (!nameMap[name]) nameMap[name] = [];
        nameMap[name].push(idx);
      });
      for (const name in nameMap) {
        if (nameMap[name].length > 1) {
          errors.push(
            `Duplicate ${typeName} name "${name}" in hub "${hubName}"`,
          );
        }
      }
    };

    const checkUnexpectedInnerText = (element: any, typeName: string) => {
      if (element.rawInnerText && element.rawInnerText.trim() !== '') {
        errors.push(
          `${typeName} "${
            element.name || '(unnamed)'
          }" has unexpected inner text: "${element.rawInnerText.trim()}"`,
        );
      }
    };

    const hubs = [...this.controlHubs, ...this.expansionHubs];
    const usedHubPorts: Record<number, string[]> = {};
    hubs.forEach((hub) => {
      if (!hub.name) errors.push(`Hub of type ${hub.type} has an empty name.`);
      if (hub instanceof ControlHub && hub.port !== 173) {
        errors.push(
          `Control Hub "${hub.name}" must have port 173, currently ${hub.port}.`,
        );
      }
      if (!isInt(hub.port)) {
        errors.push(
          `Hub "${hub.name}" port must be an integer, currently ${hub.port}.`,
        );
      } else if (!(hub instanceof ControlHub) && !inRange(hub.port, 0, 255)) {
        errors.push(
          `Hub "${hub.name}" port ${hub.port} is out of range (0-255).`,
        );
      }
      if (!usedHubPorts[hub.port]) usedHubPorts[hub.port] = [];
      usedHubPorts[hub.port].push(hub.name || '(unnamed)');

      checkUnexpectedInnerText(hub, 'Hub');

      const deviceGroups: [Device[], string][] = [
        [hub.motors, 'Motor'],
        [hub.servos, 'Servo'],
        [hub.digitalDevices, 'Digital'],
        [hub.analogInputDevices, 'Analog'],
      ];

      for (const [group, typeName] of deviceGroups) {
        checkDuplicatePorts(group, typeName, hub.name);
        checkDuplicateNames(group, typeName, hub.name);
        group.forEach((d) => checkUnexpectedInnerText(d, typeName));
      }

      [
        ...hub.motors,
        ...hub.servos,
        ...hub.digitalDevices,
        ...hub.analogInputDevices,
        ...hub.i2cDevices,
      ].forEach((d) => {
        if (!d.name)
          errors.push(
            `Device of type ${d.type} in hub "${hub.name}" has empty name.`,
          );
        if (!isInt(d.port)) {
          errors.push(
            `Device "${d.name || '(unnamed)'}" of type ${d.type} in hub "${
              hub.name
            }" has a non-integer port (${d.port}).`,
          );
        } else {
          let maxPort: number | undefined;
          if (d instanceof Motor) maxPort = maxDevices.motors - 1;
          else if (d instanceof Servo) maxPort = maxDevices.servos - 1;
          else if (d instanceof Analog)
            maxPort = maxDevices.analogInputDevices - 1;
          else if (d instanceof Digital)
            maxPort = maxDevices.digitalDevices - 1;
          if (maxPort !== undefined) {
            if (!inRange(d.port, 0, maxPort)) {
              errors.push(
                `${d.type} "${d.name || '(unnamed)'}" in hub "${
                  hub.name
                }" has port ${d.port} outside allowed range 0-${maxPort}.`,
              );
            }
          } else {
            if (!inRange(d.port, 0, 65535)) {
              errors.push(
                `${d.type} "${d.name || '(unnamed)'}" in hub "${
                  hub.name
                }" has port ${d.port} outside allowed range 0-65535.`,
              );
            }
          }
        }
        if (d instanceof I2c) {
          const bus = (d as I2c).bus;
          if (!isInt(bus)) {
            errors.push(
              `I2C device "${d.name || '(unnamed)'}" in hub "${
                hub.name
              }" has non-integer bus (${bus}).`,
            );
          } else if (!inRange(bus, 0, 255)) {
            errors.push(
              `I2C device "${d.name || '(unnamed)'}" in hub "${
                hub.name
              }" has bus ${bus} outside allowed range 0-255.`,
            );
          }
        }
      });
    });

    for (const p in usedHubPorts) {
      if (usedHubPorts[p].length > 1) {
        errors.push(
          `Duplicate hub port ${p} used by hubs: ${usedHubPorts[p].join(', ')}`,
        );
      }
    }

    this.otherDevices.forEach((d) => {
      if (!d.name) errors.push(`Device of type ${d.type} has empty name.`);
      if (d instanceof Custom) {
        if (!d.type) errors.push(`Custom hub "${d.name}" has empty type.`);
        d.attributes.forEach((attr, idx) => {
          if (!attr.key)
            errors.push(
              `Attribute #${idx + 1} in custom hub "${d.name}" has empty key.`,
            );
          checkUnexpectedInnerText(attr, `Attribute #${idx + 1}`);
        });
      }
      if (d instanceof EthernetDevice) {
        if (!d.serialNumber)
          errors.push(`Ethernet device "${d.name}" has empty serial number.`);
        if (!d.ipAddress)
          errors.push(`Ethernet device "${d.name}" has empty IP address.`);
        if (!isInt(d.port)) {
          errors.push(
            `Ethernet device "${d.name}" has non-integer port (${d.port}).`,
          );
        } else if (!inRange(d.port, 0, 65535)) {
          errors.push(
            `Ethernet device "${d.name}" has port ${d.port} outside allowed range 0-65535.`,
          );
        }
      }
      checkUnexpectedInnerText(d, 'Device');
    });

    return errors;
  }
}
