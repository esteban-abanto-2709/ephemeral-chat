import { TestBed } from '@angular/core/testing';
import { RoomSocket } from './room-socket';

class FakeWebSocket {
  static readonly OPEN = 1;
  static last: FakeWebSocket;
  readyState = FakeWebSocket.OPEN;
  sent: string[] = [];
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (message: { data: string }) => void;

  constructor(readonly url: string) {
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

const ana = { id: 'a', name: 'Ana' };
const luis = { id: 'l', name: 'Luis' };
const eva = { id: 'e', name: 'Eva' };

describe('RoomSocket', () => {
  let socket: RoomSocket;
  let server: FakeWebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    TestBed.configureTestingModule({ providers: [RoomSocket] });
    socket = TestBed.inject(RoomSocket);
    socket.connect('abc', 'Juan');
    server = FakeWebSocket.last;
    server.onopen?.();
    server.receive({ type: 'ready', id: 'j', name: 'Juan' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens the tab connection with your name and joins the room', () => {
    expect(server.url).toContain('/api/ws?name=Juan');
    expect(server.sent).toEqual(['{"type":"join","room":"abc"}']);
    expect(socket.me()).toBe('j');
    expect(socket.status()).toBe('open');
  });

  it('marks your own messages by id, even next to someone with your name', () => {
    server.receive({ type: 'message', room: 'abc', id: 'j', name: 'Juan', text: 'mine' });
    server.receive({ type: 'message', room: 'abc', id: 'x', name: 'Juan', text: 'theirs' });
    expect(socket.events().map((event) => event.type === 'message' && event.own)).toEqual([true, false]);
  });

  it('tells when the room is gone or full', () => {
    server.receive({ type: 'error', room: 'abc', code: 'full' });
    expect(socket.roomFull()).toBe(true);
    expect(socket.events()).toEqual([]);
  });

  it('shows who is typing until they send, leave or go quiet', () => {
    server.receive({ type: 'typing', room: 'abc', ...ana });
    server.receive({ type: 'typing', room: 'abc', ...luis });
    expect(socket.typing()).toEqual(['Ana', 'Luis']);
    expect(socket.events()).toEqual([]);

    server.receive({ type: 'message', room: 'abc', ...ana, text: 'hola' });
    expect(socket.typing()).toEqual(['Luis']);

    vi.advanceTimersByTime(3000);
    expect(socket.typing()).toEqual([]);

    server.receive({ type: 'typing', room: 'abc', ...eva });
    server.receive({ type: 'left', room: 'abc', ...eva, members: [] });
    expect(socket.typing()).toEqual([]);
  });

  it('signals your typing at most every 2 seconds', () => {
    server.sent = [];
    const typing = '{"type":"typing","room":"abc"}';
    socket.sendTyping();
    socket.sendTyping();
    expect(server.sent).toEqual([typing]);

    vi.advanceTimersByTime(2000);
    socket.sendTyping();
    expect(server.sent).toHaveLength(2);

    socket.send('hola');
    expect(server.sent.at(-1)).toBe('{"type":"message","room":"abc","text":"hola"}');
    socket.sendTyping();
    expect(server.sent.at(-1)).toBe(typing);
  });
});
