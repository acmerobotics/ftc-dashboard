import { store } from '@/index';
import { receiveTelemetry } from '@/store/actions/telemetry';
import { TelemetryItem } from '@/store/types';
import { OpModeStatus } from './../../../enums/OpModeStatus';
import {
  EnableDashOp,
  GamepadTestOpMode,
  MockOpMode,
  MockOpModeState,
  OrbitOpMode,
  SineWaveOpMode,
  VuforiaStreamOpMode,
} from './MockOpMode';

type OpModeStatus = {
  activeOpMode: string;
  activeOpModeStatus: MockOpModeState;
};

export class MockOpModeManager {
  opModes: MockOpMode[] = [
    new EnableDashOp(this),
    new GamepadTestOpMode(this),
    new OrbitOpMode(this),
    new SineWaveOpMode(this),
    new VuforiaStreamOpMode(this),
  ];
  activeOpMode: MockOpMode | null = null;

  lastLoopAnimationFrame = 0;

  messageQueue: { data: TelemetryItem; time: number }[] = [];
  lastQueueFlush = 0;

  getOpModeNames() {
    return this.opModes.map((o) => o.name);
  }

  initOpMode(name: string) {
    const opMode = this.opModes.find((o) => o.name === name);
    if (!opMode) return;

    opMode.state = 'INIT';
    opMode.init();
    this.activeOpMode = opMode;
  }

  startOpMode() {
    if (this.activeOpMode === null) return;
    this.activeOpMode.state = 'RUNNING';
    this.loop();
  }

  stopOpMode() {
    if (this.activeOpMode === null) return;
    this.activeOpMode.state = 'STOPPED';
    this.activeOpMode = null;

    cancelAnimationFrame(this.lastLoopAnimationFrame);
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

  loop() {
    if (this.activeOpMode === null) return;

    this.activeOpMode.loop();
    if (Date.now() - this.lastQueueFlush > 100) {
      store.dispatch(receiveTelemetry(this.messageQueue.map((t) => t.data)));
      this.messageQueue = [];
    }

    this.lastLoopAnimationFrame = requestAnimationFrame(() => this.loop());
  }

  addData(key: string, value: any) {
    this.addTelemetryMessage({
      data: { [key]: value },
      fieldOverlay: { ops: [] },
      log: [],
      timestamp: Date.now(),
    });
  }
  addTelemetryMessage(data: TelemetryItem) {
    this.messageQueue.push({ data, time: Date.now() });
  }
}

const opModeManager = new MockOpModeManager();
export default opModeManager;
