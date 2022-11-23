import { OpModeStatus } from './../../../enums/OpModeStatus';
import { mockOpModes, MockOpMode, MockOpModeState } from './MockOpMode';

type OpModeStatus = {
  activeOpMode: string;
  activeOpModeStatus: MockOpModeState;
};

class MockOpModeManager {
  activeOpMode: MockOpMode | null = null;

  getOpModeNames() {
    return mockOpModes.map((o) => o.name);
  }

  initOpMode(name: string) {
    const opMode = mockOpModes.find((o) => o.name === name);
    if (opMode) {
      opMode.state = 'INIT';
      opMode.init();
      this.activeOpMode = opMode;
    }
  }

  startOpMode() {
    if (this.activeOpMode === null) return;
    this.activeOpMode.state = 'RUNNING';
    this.activeOpMode.loop();
  }

  stopOpMode() {
    if (this.activeOpMode === null) return;
    this.activeOpMode.state = 'STOPPED';
    this.activeOpMode = null;
  }

  getOpModeStatus(): OpModeStatus {
    if (this.activeOpMode === null) {
      return {
        activeOpMode: '$Stop$Robot$',
        activeOpModeStatus: 'INIT',
      };
    }

    return {
      activeOpMode: this.activeOpMode.name,
      activeOpModeStatus: this.activeOpMode.state,
    };
  }
}

const opModeManager = new MockOpModeManager();
export default opModeManager;
