export type MockOpModeState = 'INIT' | 'RUNNING' | 'STOPPED';

export abstract class MockOpMode {
  abstract readonly name: string;

  abstract getConfig(): any;

  abstract init(): void;
  abstract loop(): void;

  state: MockOpModeState = 'INIT';
  getState() {
    return this.state;
  }
}

class EnableDashOp extends MockOpMode {
  name = 'Enable/Disable Dashboard';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}

class GamepadTestOpMode extends MockOpMode {
  name = 'GamepadTestOpMode';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}

class OrbitOpMode extends MockOpMode {
  name = 'OrbitOpMode';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}

class SinveWaveOpMode extends MockOpMode {
  name = 'SineWaveOpMode';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}

class VuforiaStreamOpMode extends MockOpMode {
  name = 'VuforiaStreamOpMode';
  getConfig() {
    return {};
  }
  init(): void {}
  loop(): void {}
}

const mockOpModes: MockOpMode[] = [
  new EnableDashOp(),
  new GamepadTestOpMode(),
  new OrbitOpMode(),
  new SinveWaveOpMode(),
  new VuforiaStreamOpMode(),
];

export { mockOpModes };
