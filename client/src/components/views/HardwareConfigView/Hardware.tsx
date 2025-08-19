import React from 'react';

export class Robot {
  public controlHubs: ControlHub[] = [];
  public expansionHubs: ExpansionHub[] = [];
  public devices: Device[] = [];

  public toString(): string {
    const lines: string[] = [];
    lines.push(`<Robot type="FirstInspires-FTC">`);

    if (this.controlHubs.length > 0 || this.expansionHubs.length > 0) {
      lines.push(
        `    <LynxUsbDevice name="Control Hub Portal" parentModuleAddress="173" serialNumber="(embedded)">`,
      );
      for (const hub of this.controlHubs) {
        const moduleXml = hub.toString();
        moduleXml.split('\n').forEach((line) => {
          if (line.trim() !== '') lines.push(`        ${line}`);
        });
      }
      for (const hub of this.expansionHubs) {
        const moduleXml = hub.toString();
        moduleXml.split('\n').forEach((line) => {
          if (line.trim() !== '') lines.push(`        ${line}`);
        });
      }
      lines.push(`    </LynxUsbDevice>`);
    }

    for (const device of this.devices) {
      const deviceXml = device.toString();
      lines.push(`    ${deviceXml}`);
    }

    lines.push(`</Robot>`);
    return lines.join('\n');
  }

  public fromXml(xmlString: string): void {
    this.controlHubs = [];
    this.expansionHubs = [];
    this.devices = [];

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    const robotElement = xmlDoc.getElementsByTagName('Robot')[0];
    if (!robotElement) return;

    const getAttr = (
      el: Element,
      name: string,
      def: string | null = null,
    ): string | null => el.getAttribute(name) ?? def;

    const createDeviceInstance = (
      element: Element,
      category: 'Motor' | 'Servo' | 'Analog' | 'Digital' | 'I2c',
    ): Device => {
      let device: Device;
      const tagName = element.tagName;

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

      device.name = getAttr(element, 'name') || '';
      device.port = parseInt(getAttr(element, 'port') || '0', 10);
      device.key = tagName;
      device.type = tagName;

      if (device instanceof I2c) {
        device.bus = parseInt(getAttr(element, 'bus') || '0', 10);
      }
      return device;
    };

    for (const childNode of Array.from(robotElement.children)) {
      if (childNode.tagName === 'LynxUsbDevice') {
        const lynxUsbDeviceElement = childNode;
        for (const moduleNode of Array.from(lynxUsbDeviceElement.children)) {
          if (moduleNode.tagName === 'LynxModule') {
            const lynxModuleElement = moduleNode;
            const hubNameAttr = getAttr(lynxModuleElement, 'name');
            const hubPortAttr = getAttr(lynxModuleElement, 'port');
            const hubPort = hubPortAttr ? parseInt(hubPortAttr, 10) : 0;

            let currentHub: Hub;
            if (
              (hubNameAttr &&
                hubNameAttr.toLowerCase().includes('control hub')) ||
              hubPort === 173
            ) {
              currentHub = new ControlHub();
              currentHub.name = hubNameAttr || 'Control Hub';
              currentHub.port = hubPort || 173;
              this.controlHubs.push(currentHub as ControlHub);
            } else {
              currentHub = new ExpansionHub();
              currentHub.name = hubNameAttr || `Expansion Hub ${hubPort}`;
              currentHub.port = hubPort;
              this.expansionHubs.push(currentHub as ExpansionHub);
            }

            for (const deviceElement of Array.from(
              lynxModuleElement.children,
            )) {
              if (deviceElement.nodeType !== Node.ELEMENT_NODE) continue;

              const tagName = deviceElement.tagName;
              let deviceInstance: Device | null = null;

              if (Object.values(motorType).includes(tagName as string)) {
                deviceInstance = createDeviceInstance(deviceElement, 'Motor');
                currentHub.motors.push(deviceInstance as Motor);
              } else if (Object.values(servoType).includes(tagName as string)) {
                deviceInstance = createDeviceInstance(deviceElement, 'Servo');
                currentHub.servos.push(deviceInstance as Servo);
              } else if (Object.values(i2cType).includes(tagName as string)) {
                deviceInstance = createDeviceInstance(deviceElement, 'I2c');
                currentHub.i2cDevices.push(deviceInstance as I2c);
              } else if (
                Object.values(analogType).includes(tagName as string)
              ) {
                deviceInstance = createDeviceInstance(deviceElement, 'Analog');
                currentHub.analogInputDevices.push(deviceInstance as Analog);
              } else if (
                Object.values(digitalType).includes(tagName as string)
              ) {
                deviceInstance = createDeviceInstance(deviceElement, 'Digital');
                currentHub.digitalDevices.push(deviceInstance as Digital);
              }
            }
          }
        }
      } else if (childNode.tagName === 'EthernetDevice') {
        const ethDeviceElement = childNode;
        const ethDevice = new EthernetDevice();
        ethDevice.name = getAttr(ethDeviceElement, 'name') || '';
        ethDevice.serialNumber =
          getAttr(ethDeviceElement, 'serialNumber') || '';
        ethDevice.port = parseInt(getAttr(ethDeviceElement, 'port') || '0', 10);
        ethDevice.ipAddress = getAttr(ethDeviceElement, 'ipAddress') || '';
        this.devices.push(ethDevice);
      } else if (childNode.tagName === 'Webcam') {
        const webcamElement = childNode;
        const webcam = new Webcam();
        webcam.name = getAttr(webcamElement, 'name') || '';
        webcam.serialNumber = getAttr(webcamElement, 'serialNumber') || '';
        this.devices.push(webcam);
      }
    }
  }

  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
  ): JSX.Element {
    return (
      <div
        key={keyPrefix}
        style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}
      >
        <h3>Robot Configuration</h3>
        <button
          style={addButtonStyle}
          onClick={() => {
            this.controlHubs.push(new ControlHub());
            configChangeCallback();
          }}
        >
          +
        </button>{' '}
        Control Hub
        <button
          style={addButtonStyle}
          onClick={() => {
            this.expansionHubs.push(new ExpansionHub());
            configChangeCallback();
          }}
        >
          +
        </button>{' '}
        Expansion Hub
        <hr />
        {this.controlHubs.map((hub, index) =>
          hub.renderAsGui(
            configChangeCallback,
            `${keyPrefix}-ch-${index}`,
            () => {
              this.controlHubs.splice(index, 1);
              configChangeCallback();
            },
          ),
        )}
        {this.expansionHubs.map((hub, index) =>
          hub.renderAsGui(
            configChangeCallback,
            `${keyPrefix}-eh-${index}`,
            () => {
              this.expansionHubs.splice(index, 1);
              configChangeCallback();
            },
          ),
        )}
        <h4>Other Devices</h4>
        <button
          style={addButtonStyle}
          onClick={() => {
            this.devices.push(new EthernetDevice());
            configChangeCallback();
          }}
        >
          +
        </button>{' '}
        Ethernet Device
        <button
          style={addButtonStyle}
          onClick={() => {
            this.devices.push(new Webcam());
            configChangeCallback();
          }}
        >
          +
        </button>{' '}
        Webcam
        {this.devices.map((device, index) =>
          device.renderAsGui(
            configChangeCallback,
            `${keyPrefix}-od-${index}`,
            () => {
              this.devices.splice(index, 1);
              configChangeCallback();
            },
          ),
        )}
      </div>
    );
  }
}

export abstract class Device {
  public name: string;
  public port: number;
  public type: string;
  public key: string;

  constructor() {
    this.name = '';
    this.port = 0;
    this.type = '';
    this.key = '';
  }

  public toString(): string {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }

  public abstract renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element;
}

const deviceContainerStyle: React.CSSProperties = {
  marginLeft: '20px',
  border: '1px solid #ccc',
  padding: '10px',
  margin: '10px',
  backgroundColor: '#f9f9f9',
  position: 'relative',
  borderRadius: '8px',
};
const inputStyle: React.CSSProperties = {
  marginRight: '10px',
  padding: '4px',
  border: '1px solid #ddd',
  borderRadius: '4px',
};
const labelStyle: React.CSSProperties = {
  marginRight: '5px',
  fontWeight: 'bold',
};
const selectStyle: React.CSSProperties = { ...inputStyle };
const deleteButtonStyle: React.CSSProperties = {
  marginLeft: '10px',
  padding: '2px 8px',
  backgroundColor: '#ffdddd',
  border: '1px solid #ff0000',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.8em',
};
const addButtonStyle: React.CSSProperties = {
  marginLeft: '10px',
  padding: '2px 8px',
  backgroundColor: '#ddffdd',
  border: '1px solid #00cc00',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.8em',
};
const hubDeleteButtonStyle: React.CSSProperties = {
  ...deleteButtonStyle,
  position: 'absolute',
  top: '15px',
  right: '15px',
};

export abstract class Hub extends Device {
  public motors: Motor[] = [];
  public servos: Servo[] = [];
  public i2cDevices: I2c[] = [];
  public digitalDevices: Digital[] = [];
  public analogInputDevices: Analog[] = [];

  constructor() {
    super();
  }

  public override toString(): string {
    const lines: string[] = [];
    lines.push(
      `<${this.key} name="${this.name}" port="${
        isNaN(this.port) ? 0 : this.port
      }">`,
    );

    const addSection = (title: string, devices: Device[]) => {
      if (devices.length > 0) {
        lines.push(`    <!-- ${title} -->`);
        devices.forEach((hw) => {
          const deviceXmlLines = hw.toString().split('\n');
          deviceXmlLines.forEach((line) => lines.push(`    ${line}`));
        });
      }
    };

    addSection('Motors', this.motors);
    addSection('Servos', this.servos);
    addSection('I2C Devices', this.i2cDevices);
    addSection('Digital Devices', this.digitalDevices);
    addSection('Analog Inputs', this.analogInputDevices);

    lines.push(`</${this.key}>`);
    return lines.join('\n');
  }

  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return (
      <div
        key={keyPrefix}
        style={{
          border: '2px solid #007bff',
          padding: '15px',
          margin: '15px',
          borderRadius: '8px',
          backgroundColor: '#e7f3ff',
          position: 'relative',
        }}
      >
        <h4>
          <label style={labelStyle}>Hub Name: </label>
          <input
            style={inputStyle}
            type="text"
            value={this.name}
            onChange={(e) => {
              this.name = e.target.value;
              configChangeCallback();
            }}
          />
          <label style={labelStyle}>Port: </label>
          <input
            style={inputStyle}
            type="number"
            value={isNaN(this.port) ? '' : this.port}
            onChange={(e) => {
              this.port = parseInt(e.target.value, 10);
              configChangeCallback();
            }}
          />
          ({this.type})
          {onDelete && (
            <button style={hubDeleteButtonStyle} onClick={onDelete}>
              X
            </button>
          )}
        </h4>

        <div>
          <h5>
            Motors{' '}
            <button
              style={addButtonStyle}
              onClick={() => {
                this.motors.push(new Motor());
                configChangeCallback();
              }}
            >
              +
            </button>
          </h5>
          {this.motors.map((motor, index) =>
            motor.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-motor-${index}`,
              () => {
                this.motors.splice(index, 1);
                configChangeCallback();
              },
            ),
          )}
        </div>
        <div>
          <h5>
            Servos{' '}
            <button
              style={addButtonStyle}
              onClick={() => {
                this.servos.push(new Servo());
                configChangeCallback();
              }}
            >
              +
            </button>
          </h5>
          {this.servos.map((servo, index) =>
            servo.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-servo-${index}`,
              () => {
                this.servos.splice(index, 1);
                configChangeCallback();
              },
            ),
          )}
        </div>
        <div>
          <h5>
            I2C Devices{' '}
            <button
              style={addButtonStyle}
              onClick={() => {
                this.i2cDevices.push(new I2c());
                configChangeCallback();
              }}
            >
              +
            </button>
          </h5>
          {this.i2cDevices.map((i2c, index) =>
            i2c.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-i2c-${index}`,
              () => {
                this.i2cDevices.splice(index, 1);
                configChangeCallback();
              },
            ),
          )}
        </div>
        <div>
          <h5>
            Analog Inputs{' '}
            <button
              style={addButtonStyle}
              onClick={() => {
                this.analogInputDevices.push(new Analog());
                configChangeCallback();
              }}
            >
              +
            </button>
          </h5>
          {this.analogInputDevices.map((analog, index) =>
            analog.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-analog-${index}`,
              () => {
                this.analogInputDevices.splice(index, 1);
                configChangeCallback();
              },
            ),
          )}
        </div>
        <div>
          <h5>
            Digital Devices{' '}
            <button
              style={addButtonStyle}
              onClick={() => {
                this.digitalDevices.push(new Digital());
                configChangeCallback();
              }}
            >
              +
            </button>
          </h5>
          {this.digitalDevices.map((digital, index) =>
            digital.renderAsGui(
              configChangeCallback,
              `${keyPrefix}-digital-${index}`,
              () => {
                this.digitalDevices.splice(index, 1);
                configChangeCallback();
              },
            ),
          )}
        </div>
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

export class EthernetDevice extends Device {
  public serialNumber: string;
  public ipAddress: string;

  constructor() {
    super();
    this.serialNumber = '';
    this.ipAddress = '';
    this.type = 'EthernetDevice';
    this.key = 'EthernetDevice';
  }

  public override toString(): string {
    return `<${this.key} name="${this.name}" serialNumber="${
      this.serialNumber
    }" port="${isNaN(this.port) ? 0 : this.port}" ipAddress="${
      this.ipAddress
    }" />`;
  }

  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return (
      <div key={keyPrefix} style={deviceContainerStyle}>
        {onDelete && (
          <button
            style={{
              ...deleteButtonStyle,
              position: 'absolute',
              top: '5px',
              right: '5px',
            }}
            onClick={onDelete}
          >
            X
          </button>
        )}
        <div>
          <label style={labelStyle}>Name: </label>
          <input
            style={inputStyle}
            type="text"
            value={this.name}
            onChange={(e) => {
              this.name = e.target.value;
              configChangeCallback();
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Port: </label>
          <input
            style={inputStyle}
            type="number"
            value={isNaN(this.port) ? '' : this.port}
            onChange={(e) => {
              this.port = parseInt(e.target.value, 10);
              configChangeCallback();
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Serial: </label>
          <input
            style={inputStyle}
            type="text"
            value={this.serialNumber}
            onChange={(e) => {
              this.serialNumber = e.target.value;
              configChangeCallback();
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>IP Address: </label>
          <input
            style={inputStyle}
            type="text"
            value={this.ipAddress}
            onChange={(e) => {
              this.ipAddress = e.target.value;
              configChangeCallback();
            }}
          />
        </div>
      </div>
    );
  }
}

export class Webcam extends Device {
  public serialNumber: string;

  constructor() {
    super();
    this.serialNumber = '';
    this.type = 'Webcam';
    this.key = 'Webcam';
  }

  public override toString(): string {
    return `<${this.key} name="${this.name}" serialNumber="${this.serialNumber}" />`;
  }

  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    return (
      <div key={keyPrefix} style={deviceContainerStyle}>
        {onDelete && (
          <button
            style={{
              ...deleteButtonStyle,
              position: 'absolute',
              top: '5px',
              right: '5px',
            }}
            onClick={onDelete}
          >
            X
          </button>
        )}
        <div>
          <label style={labelStyle}>Name: </label>
          <input
            style={inputStyle}
            type="text"
            value={this.name}
            onChange={(e) => {
              this.name = e.target.value;
              configChangeCallback();
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Serial: </label>
          <input
            style={inputStyle}
            type="text"
            value={this.serialNumber}
            onChange={(e) => {
              this.serialNumber = e.target.value;
              configChangeCallback();
            }}
          />
        </div>
      </div>
    );
  }
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

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const renderStandardDevice = (
  device: Device,
  typeObject: Record<string, string>,
  configChangeCallback: () => void,
  keyPrefix: string,
  onDelete?: () => void,
  additionalFields?: JSX.Element | null,
): JSX.Element => {
  let minPort = 0;
  let maxPort = 255;

  if (typeObject === motorType) {
    maxPort = 3;
  } else if (typeObject === servoType) {
    maxPort = 5;
  } else if (typeObject === analogType) {
    maxPort = 3;
  } else if (typeObject === digitalType) {
    maxPort = 7;
  }

  return (
    <div key={keyPrefix} style={deviceContainerStyle}>
      {onDelete && (
        <button
          style={{
            ...deleteButtonStyle,
            position: 'absolute',
            top: '5px',
            right: '5px',
          }}
          onClick={onDelete}
        >
          X
        </button>
      )}
      <div>
        <label style={labelStyle}>Name: </label>
        <input
          style={inputStyle}
          type="text"
          value={device.name}
          onChange={(e) => {
            device.name = e.target.value;
            configChangeCallback();
          }}
        />
      </div>
      <div>
        <label style={labelStyle}>Type: </label>
        <select
          style={selectStyle}
          value={device.type}
          onChange={(e) => {
            device.type = e.target.value;
            device.key = e.target.value;
            configChangeCallback();
          }}
        >
          {Object.entries(typeObject).map(([displayName, xmlName]) => (
            <option key={xmlName} value={xmlName}>
              {displayName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Port: </label>
        <input
          style={inputStyle}
          type="number"
          value={isNaN(device.port) ? '' : device.port}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (isNaN(val)) {
              device.port = 0;
            } else {
              device.port = clamp(val, minPort, maxPort);
            }
            configChangeCallback();
          }}
          min={minPort}
          max={maxPort}
        />
      </div>
      {additionalFields}
    </div>
  );
};

export class Motor extends Device {
  constructor() {
    super();
    this.type = motorType.Generic;
    this.key = motorType.Generic;
  }
  public override toString(): string {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public renderAsGui(
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
  public override toString(): string {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public renderAsGui(
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
  public override toString(): string {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public renderAsGui(
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
  public override toString(): string {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" />`;
  }
  public renderAsGui(
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
  public bus: number;
  constructor() {
    super();
    this.bus = 0;
    this.type = i2cType.AdafruitBNO055;
    this.key = i2cType.AdafruitBNO055;
  }
  public override toString(): string {
    return `<${this.key} name="${this.name}" port="${
      isNaN(this.port) ? 0 : this.port
    }" bus="${isNaN(this.bus) ? 0 : this.bus}" />`;
  }
  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ): JSX.Element {
    const busField = (
      <div>
        <label style={labelStyle}>Bus: </label>
        <input
          style={inputStyle}
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
