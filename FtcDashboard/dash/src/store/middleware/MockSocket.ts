import { receiveRobotStatus, receiveOpModeList } from './../actions/status';
import { store } from '@/index';
import { GET_ROBOT_STATUS } from './../types/status';

class MockSocket implements WebSocket {
  // @ts-ignore
  binaryType: BinaryType;
  // @ts-ignore
  bufferedAmount: number;
  // @ts-ignore
  extensions: string;
  // @ts-ignore
  protocol: string;

  // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;

  readyState = this.CLOSED;
  url = 'ws://mocksocket:0000';

  latencyBase = 5;
  latencyVariance = 10;
  messageQueue: { data: any; time: number }[] = [];
  lastConsumeQueueAnimationFrame = 0;

  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = () => {};
  onerror: ((this: WebSocket, ev: Event) => any) | null = () => {};
  onmessage: ((this: WebSocket, ev: MessageEvent<any>) => any) | null =
    () => {};
  onopen: ((this: WebSocket, ev: Event) => any) | null = () => {};

  IS_MOCK_SOCKET = true;

  constructor() {
    this.readyState = this.CONNECTING;
  }

  DEV_OPEN() {
    this.readyState = this.OPEN;
    this.onopen?.(new Event('open'));
    this.consumeMessageQueue();

    store.dispatch(
      receiveOpModeList([
        'Enable/Disable Dashboard',
        'GamepadTestOpMode',
        'OrbitOpMode',
        'SineWaveOpMode',
        'VuforiaStreamOpMode',
      ]),
    );
  }

  close(code?: number | undefined, reason?: string | undefined): void {
    this.readyState = this.CLOSED;
    cancelAnimationFrame(this.lastConsumeQueueAnimationFrame);
    this.onclose?.(new CloseEvent('close'));
  }

  processSend(data: string) {
    if (typeof data !== 'string') return;
    const obj = JSON.parse(data);

    switch (obj.type) {
      case GET_ROBOT_STATUS:
        store.dispatch(
          receiveRobotStatus({
            activeOpMode: '$Stop$Robot$',
            activeOpModeStatus: 'INIT',
            available: true,
            errorMessage: '',
            warningMessage: '',
          }),
        );
        break;
      default:
        break;
    }
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.messageQueue.push({
      data,
      time:
        Date.now() + this.latencyBase + this.latencyVariance * Math.random(),
    });
  }

  consumeMessageQueue() {
    const now = Date.now();
    while (this.messageQueue.length > 0 && this.messageQueue[0].time < now) {
      const msg = this.messageQueue.shift();
      this.processSend(msg?.data);
    }

    if (this.readyState === this.OPEN)
      this.lastConsumeQueueAnimationFrame = requestAnimationFrame(
        this.consumeMessageQueue.bind(this),
      );
  }

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void;
  addEventListener(type: unknown, listener: unknown, options?: unknown): void {
    throw new Error('Method not implemented.');
  }
  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions | undefined,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions | undefined,
  ): void;
  removeEventListener(
    type: unknown,
    listener: unknown,
    options?: unknown,
  ): void {
    throw new Error('Method not implemented.');
  }
  dispatchEvent(event: Event): boolean {
    throw new Error('Method not implemented.');
  }
}

export default MockSocket;
