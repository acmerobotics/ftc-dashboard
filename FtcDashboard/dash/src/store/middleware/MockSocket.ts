import { GetRobotStatusAction, GET_ROBOT_STATUS } from './../types/status';

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
  }

  close(code?: number | undefined, reason?: string | undefined): void {
    this.readyState = this.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (typeof data !== 'string') return;
    const obj = JSON.parse(data);

    switch (obj.type) {
      case GET_ROBOT_STATUS:
        console.log('MockSocket: GET_ROBOT_STATUS');
        break;
      default:
        break;
    }
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
