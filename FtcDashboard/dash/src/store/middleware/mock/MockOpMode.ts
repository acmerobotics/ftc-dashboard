import { MockOpModeManager } from './MockOpModeManager';
export type MockOpModeState = 'INIT' | 'RUNNING' | 'STOPPED';

export abstract class MockOpMode {
  abstract readonly name: string;

  abstract getConfig(): any;

  abstract init(): void;
  abstract loop(): void;

  state: MockOpModeState = 'INIT';
  constructor(protected readonly opModeManager: MockOpModeManager) {}
}

export class EnableDashOp extends MockOpMode {
  name = 'Enable/Disable Dashboard';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}

export class GamepadTestOpMode extends MockOpMode {
  name = 'GamepadTestOpMode';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}

export class OrbitOpMode extends MockOpMode {
  name = 'OrbitOpMode';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}

export class SineWaveOpMode extends MockOpMode {
  name = 'SineWaveOpMode';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {
    this.opModeManager.addData('x', Math.sin(Date.now() / 1000));
  }
}

export class VuforiaStreamOpMode extends MockOpMode {
  name = 'VuforiaStreamOpMode';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}
