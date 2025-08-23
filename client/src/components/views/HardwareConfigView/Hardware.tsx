import React from 'react';
import { ReactComponent as RemoveCircleOutline } from '@/assets/icons/remove_circle_outline.svg';
import { ReactComponent as ExpandMore } from '@/assets/icons/expand_more.svg';

interface RobotSectionState {
  controlHubs: boolean;
  expansionHubs: boolean;
  otherDevices: boolean;
}

export class Robot {
  public name: string;
  public controlHubs: ControlHub[] = [];
  public expansionHubs: ExpansionHub[] = [];
  public devices: Device[] = [];
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

    for (const device of this.devices) {
      lines.push(`    ${device.toString()}`);
    }

    lines.push(`</Robot>`);
    return lines.join('\n');
  }

  public fromXml(xmlString: string): void {
    this.controlHubs = [];
    this.expansionHubs = [];
    this.devices = [];
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
      def: string | null = null,
    ): string | null => el.getAttribute(name) ?? def;

    const lynxUsbDeviceElement =
      robotElement.getElementsByTagName('LynxUsbDevice')[0];
    if (lynxUsbDeviceElement) {
      this.name = getAttr(lynxUsbDeviceElement, 'name') || this.name;
    }

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

    for (const child of Array.from(robotElement.children)) {
      if (child.tagName === 'LynxUsbDevice') {
        for (const moduleNode of Array.from(child.children)) {
          if (moduleNode.tagName === 'LynxModule') {
            const module = moduleNode as Element;
            const name = getAttr(module, 'name');
            const port = parseInt(getAttr(module, 'port') || '0', 10);

            const hub: Hub =
              name?.toLowerCase().includes('control hub') || port === 173
                ? new ControlHub()
                : new ExpansionHub();

            hub.name = name || hub.name;
            hub.port = port || hub.port;
            (hub instanceof ControlHub
              ? this.controlHubs
              : this.expansionHubs
            ).push(hub);

            for (const deviceEl of Array.from(module.children)) {
              if (deviceEl.nodeType !== Node.ELEMENT_NODE) continue;
              const tag = deviceEl.tagName;
              let d: Device | null = null;

              if (Object.values(motorType).includes(tag as string)) {
                d = createDeviceInstance(deviceEl, 'Motor');
                hub.motors.push(d as Motor);
              } else if (Object.values(servoType).includes(tag as string)) {
                d = createDeviceInstance(deviceEl, 'Servo');
                hub.servos.push(d as Servo);
              } else if (Object.values(i2cType).includes(tag as string)) {
                d = createDeviceInstance(deviceEl, 'I2c');
                hub.i2cDevices.push(d as I2c);
              } else if (Object.values(analogType).includes(tag as string)) {
                d = createDeviceInstance(deviceEl, 'Analog');
                hub.analogInputDevices.push(d as Analog);
              } else if (Object.values(digitalType).includes(tag as string)) {
                d = createDeviceInstance(deviceEl, 'Digital');
                hub.digitalDevices.push(d as Digital);
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
        d.name = getAttr(child, 'name') || '';
        if (d instanceof EthernetDevice) {
          d.serialNumber = getAttr(child, 'serialNumber') || '';
          d.port = parseInt(getAttr(child, 'port') || '0', 10);
          d.ipAddress = getAttr(child, 'ipAddress') || '';
        } else {
          d.serialNumber = getAttr(child, 'serialNumber') || '';
        }
        this.devices.push(d);
      }
    }
  }

  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
  ): JSX.Element {
    const isControlHubsCollapsed = this.collapsedSections.controlHubs;
    const isExpansionHubsCollapsed = this.collapsedSections.expansionHubs;
    const isOtherDevicesCollapsed = this.collapsedSections.otherDevices;

    const sectionTitleStyle: React.CSSProperties = {
      margin: 0,
      fontSize: '1rem',
      color: '#374151',
    };

    return (
      <div
        key={keyPrefix}
        style={{ padding: '0px', fontFamily: 'Arial, sans-serif' }}
      >
        <label style={labelStyle}>Control Hub Portal Name: </label>
        <input
          style={inputStyle}
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
            style={{ ...sectionHeaderStyle, padding: '0.5rem' }}
            onClick={() => {
              this.collapsedSections.controlHubs = !isControlHubsCollapsed;
              configChangeCallback();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h4 style={sectionTitleStyle}>
                Control Hubs {`(${this.controlHubs.length})`}{' '}
              </h4>
              <button
                style={addButtonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isControlHubsCollapsed)
                    this.collapsedSections.controlHubs = false;
                  this.controlHubs.push(new ControlHub());
                  configChangeCallback();
                }}
              >
                +
              </button>
            </div>

            <button style={toggleButtonStyle}>
              <ExpandMore
                style={{
                  transform: isControlHubsCollapsed
                    ? 'rotate(-90deg)'
                    : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  width: '1rem',
                  height: '1rem',
                }}
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
            style={{ ...sectionHeaderStyle, padding: '0.5rem' }}
            onClick={() => {
              this.collapsedSections.expansionHubs = !isExpansionHubsCollapsed;
              configChangeCallback();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h4 style={sectionTitleStyle}>
                Expansion Hubs {`(${this.expansionHubs.length})`}{' '}
              </h4>
              <button
                style={addButtonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isExpansionHubsCollapsed)
                    this.collapsedSections.expansionHubs = false;
                  this.expansionHubs.push(new ExpansionHub());
                  configChangeCallback();
                }}
              >
                +
              </button>
            </div>

            <button style={toggleButtonStyle}>
              <ExpandMore
                style={{
                  transform: isExpansionHubsCollapsed
                    ? 'rotate(-90deg)'
                    : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  width: '1rem',
                  height: '1rem',
                }}
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
            style={{ ...sectionHeaderStyle, padding: '0.5rem' }}
            onClick={() => {
              this.collapsedSections.otherDevices = !isOtherDevicesCollapsed;
              configChangeCallback();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h4 style={sectionTitleStyle}>Other Devices</h4>
            </div>
            <button style={toggleButtonStyle}>
              <ExpandMore
                style={{
                  transform: isOtherDevicesCollapsed
                    ? 'rotate(-90deg)'
                    : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  width: '1rem',
                  height: '1rem',
                }}
              />
            </button>
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', padding: '8px' }}
          >
            <span style={{ marginLeft: '4px' }}>
              Ethernet Device{' '}
              {`(${
                this.devices.filter((d) => d instanceof EthernetDevice).length
              })`}{' '}
            </span>
            <button
              style={addButtonStyle}
              onClick={(e) => {
                e.stopPropagation();
                this.devices.push(new EthernetDevice());
                configChangeCallback();
              }}
            >
              +
            </button>
            <span style={{ marginLeft: '16px' }}>
              Webcam{' '}
              {`(${this.devices.filter((d) => d instanceof Webcam).length})`}{' '}
            </span>
            <button
              style={addButtonStyle}
              onClick={(e) => {
                e.stopPropagation();
                this.devices.push(new Webcam());
                configChangeCallback();
              }}
            >
              +
            </button>
          </div>
          {!isOtherDevicesCollapsed &&
            this.devices.map((device, index) =>
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
      </div>
    );
  }
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
const deviceContainerStyle: React.CSSProperties = {
  position: 'relative',
  marginLeft: '1rem',
  padding: '0.5rem',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};
const inputStyle: React.CSSProperties = {
  marginRight: '0.5rem',
  padding: '0.15rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
};
const labelStyle: React.CSSProperties = {
  marginRight: '0.25rem',
  fontSize: '0.9rem',
};
const selectStyle = { ...inputStyle } as React.CSSProperties;
const deleteButtonStyle: React.CSSProperties = {
  width: '1.5rem',
  height: '1.5rem',
  backgroundColor: '#fee2e2',
  border: '1px solid #ef4444',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};
const addButtonStyle: React.CSSProperties = {
  marginLeft: '0.5rem',
  width: '1.5rem',
  height: '1.5rem',
  backgroundColor: '#dcfce7',
  border: '1px solid #22c55e',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontSize: '1.2rem',
  color: '#166534',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const hubDeleteButtonStyle: React.CSSProperties = {
  ...deleteButtonStyle,
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
};
const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '1rem',
  color: '#374151',
};
const toggleButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '0 0.25rem',
  color: '#4b5563',
};

interface HubSectionState {
  motors: boolean;
  servos: boolean;
  i2cDevices: boolean;
  digitalDevices: boolean;
  analogInputDevices: boolean;
}
export abstract class Hub extends Device {
  public motors: Motor[] = [];
  public servos: Servo[] = [];
  public i2cDevices: I2c[] = [];
  public digitalDevices: Digital[] = [];
  public analogInputDevices: Analog[] = [];
  public collapsedSections: HubSectionState;

  constructor() {
    super();
    this.collapsedSections = {
      motors: false,
      servos: false,
      i2cDevices: false,
      digitalDevices: false,
      analogInputDevices: false,
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
    lines.push(`</${this.key}>`);
    return lines.join('\n');
  }

  public renderAsGui(
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
    ) => {
      const collapsed = this.collapsedSections[name];
      return (
        <div>
          <div
            style={sectionHeaderStyle}
            onClick={() => {
              this.collapsedSections[name] = !collapsed;
              configChangeCallback();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h5 style={{ margin: '8px', marginRight: '10px' }}>
                {title} {`(${devs.length})`}{' '}
              </h5>
              <button
                style={{ ...addButtonStyle, marginLeft: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (collapsed) this.collapsedSections[name] = false;
                  addCb();
                }}
              >
                +
              </button>
            </div>
            <button
              style={toggleButtonStyle}
              onClick={(e) => {
                e.stopPropagation();
                this.collapsedSections[name] = !collapsed;
                configChangeCallback();
              }}
            >
              <ExpandMore
                style={{
                  transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  width: '1rem',
                  height: '1rem',
                }}
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
              <RemoveCircleOutline
                style={{ width: '1.25rem', height: '1.25rem', fill: '#b91c1c' }}
              />
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
            <RemoveCircleOutline
              style={{ width: '1.25rem', height: '1.25rem', fill: '#b91c1c' }}
            />
          </button>
        )}
        <label style={labelStyle}> {this.type}: </label>
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
  public serialNumber = '';
  constructor() {
    super();
    this.type = 'Webcam';
    this.key = 'Webcam';
  }
  public override toString() {
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
            <RemoveCircleOutline
              style={{ width: '1.25rem', height: '1.25rem', fill: '#b91c1c' }}
            />
          </button>
        )}
        <label style={labelStyle}> {this.type}: </label>
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

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const renderStandardDevice = (
  device: Device,
  typeObj: Record<string, string>,
  configChangeCallback: () => void,
  keyPrefix: string,
  onDelete?: () => void,
  extra?: JSX.Element | null,
) => {
  const min = 0;
  let max = 255;
  if (typeObj === motorType) max = 3;
  if (typeObj === servoType) max = 5;
  if (typeObj === analogType) max = 3;
  if (typeObj === digitalType) max = 7;

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
          <RemoveCircleOutline
            style={{ width: '1.25rem', height: '1.25rem', fill: '#b91c1c' }}
          />
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
          {Object.entries(typeObj).map(([display, xml]) => (
            <option key={xml} value={xml}>
              {display}
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
            if (!isNaN(val)) device.port = clamp(val, min, max);
            else device.port = 0;
            configChangeCallback();
          }}
          min={min}
          max={max}
        />
      </div>
      {extra}
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
  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ) {
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
  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ) {
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
  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ) {
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
  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ) {
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
  public renderAsGui(
    configChangeCallback: () => void,
    keyPrefix: string,
    onDelete?: () => void,
  ) {
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