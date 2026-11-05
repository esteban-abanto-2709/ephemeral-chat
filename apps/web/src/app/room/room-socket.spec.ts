import { TestBed } from '@angular/core/testing';
import { RoomSocket } from './room-socket';

class FakeWebSocket {
  static readonly OPEN = 1;
  static last: FakeWebSocket;
  readyState = FakeWebSocket.OPEN;
  sent: string[] = [];
  onopen?: () => void;
  onclose?: (event: { code: number }) => void;
  onmessage?: (message: { data: string }) => void;

  constructor() {
    FakeWebSocket.last = this;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {}

  receive(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe('RoomSocket', () => {
  let socket: RoomSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    TestBed.configureTestingModule({ providers: [RoomSocket] });
    socket = TestBed.inject(RoomSocket);
    socket.connect('abc', 'Juan');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows who is typing until they send, leave or go quiet', () => {
    const server = FakeWebSocket.last;
    server.receive({ type: 'typing', name: 'Ana' });
    server.receive({ type: 'typing', name: 'Luis' });
    expect(socket.typing()).toEqual(['Ana', 'Luis']);
    expect(socket.events()).toEqual([]);

    server.receive({ type: 'message', name: 'Ana', text: 'hola' });
    expect(socket.typing()).toEqual(['Luis']);

    vi.advanceTimersByTime(3000);
    expect(socket.typing()).toEqual([]);

    server.receive({ type: 'typing', name: 'Eva' });
    server.receive({ type: 'left', name: 'Eva', members: ['Juan'] });
    expect(socket.typing()).toEqual([]);
  });

  it('signals your typing at most every 2 seconds', () => {
    const server = FakeWebSocket.last;
    socket.sendTyping();
    socket.sendTyping();
    expect(server.sent).toEqual(['{"type":"typing"}']);

    vi.advanceTimersByTime(2000);
    socket.sendTyping();
    expect(server.sent).toHaveLength(2);

    socket.send('hola');
    socket.sendTyping();
    expect(server.sent.at(-1)).toBe('{"type":"typing"}');
  });
});
