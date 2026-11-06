import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Notice } from '../notice';
import { ChatClient, fileMaxBytes, maxChats } from './chat-client';

class FakeWebSocket {
  static readonly OPEN = 1;
  static last: FakeWebSocket;
  readyState = FakeWebSocket.OPEN;
  sent: object[] = [];
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (message: { data: string }) => void;

  constructor(readonly url: string) {
    FakeWebSocket.last = this;
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {}

  receive(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

const ana = { id: 'a', name: 'Ana' };
const luis = { id: 'l', name: 'Luis' };
const juan = { id: 'j', name: 'Juan' };

describe('ChatClient', () => {
  let client: ChatClient;
  let server: FakeWebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    TestBed.configureTestingModule({
      providers: [ChatClient, provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(ChatClient);
    client.connect('Juan');
    server = FakeWebSocket.last;
    server.onopen?.();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function ready(): void {
    server.receive({ type: 'ready', ...juan });
  }

  it('joins the chats picked before the connection was ready', () => {
    expect(server.url).toContain('/api/ws?name=Juan');
    client.join('abc');
    expect(server.sent).toEqual([]);

    ready();
    expect(client.me()).toBe('j');
    expect(server.sent).toEqual([{ type: 'join', room: 'abc' }]);
    expect(client.active()?.id).toBe('abc');
  });

  it('keeps each chat apart and counts unread messages in the ones not open', () => {
    ready();
    client.join('one');
    client.join('two');
    server.receive({ type: 'joined', room: 'one', ...juan, title: 'Trip', members: [juan] });
    server.receive({ type: 'message', room: 'one', ...ana, text: 'hola' });
    vi.advanceTimersByTime(1000);
    server.receive({ type: 'message', room: 'two', ...juan, text: 'mine' });

    const [two, one] = client.chats();
    expect(one.title).toBe('Trip');
    expect(one.members).toEqual([juan]);
    expect(one.unread).toBe(1);
    expect(two.events.map((event) => event.type === 'message' && event.own)).toEqual([true]);

    client.open('one');
    expect(client.chats().find((chat) => chat.id === 'one')?.unread).toBe(0);
  });

  it('drops a chat the server refuses and says why', () => {
    ready();
    client.join('gone');
    server.receive({ type: 'error', room: 'gone', code: 'gone' });
    expect(client.chats()).toEqual([]);
    expect(client.active()).toBeNull();
    expect(TestBed.inject(Notice).text()).toContain('is gone');
  });

  it(`holds at most ${maxChats} chats`, () => {
    ready();
    for (let i = 0; i <= maxChats; i++) {
      client.join(`room-${i}`);
    }
    expect(client.chats()).toHaveLength(maxChats);
    expect(TestBed.inject(Notice).text()).toContain(`${maxChats} chats`);
  });

  it('creates a group and opens it', () => {
    ready();
    client.create('Trip');
    TestBed.inject(HttpTestingController)
      .expectOne({ method: 'POST', url: '/api/rooms' })
      .flush({ id: 'new' });
    expect(client.active()).toMatchObject({ id: 'new', title: 'Trip' });
    expect(server.sent).toEqual([{ type: 'join', room: 'new' }]);
  });

  it('gets private chats opened by others without opening them', () => {
    ready();
    server.receive({
      type: 'joined',
      room: 'l',
      ...luis,
      title: 'Luis',
      private: true,
      members: [juan, luis],
    });
    expect(client.chats()).toEqual([
      expect.objectContaining({ id: 'l', kind: 'private', title: 'Luis', events: [] }),
    ]);
    expect(client.active()).toBeNull();

    server.receive({ type: 'message', room: 'l', ...luis, text: 'hola' });
    server.receive({ type: 'left', room: 'l', ...luis, members: [juan] });
    expect(client.chats()[0]).toMatchObject({ ended: true, unread: 1 });

    client.remove('l');
    expect(client.chats()).toEqual([]);
    expect(server.sent.at(-1)).toEqual({ type: 'leave', room: 'l' });
  });

  it('rejoins every group after reconnecting and ends private chats', () => {
    ready();
    client.join('one');
    client.join('two');
    server.receive({
      type: 'joined',
      room: 'l',
      ...luis,
      title: 'Luis',
      private: true,
      members: [juan, luis],
    });
    client.reconnect();
    server = FakeWebSocket.last;
    server.onopen?.();
    server.receive({ type: 'ready', id: 'j2', name: 'Juan' });
    expect(server.sent).toEqual([
      { type: 'join', room: 'one' },
      { type: 'join', room: 'two' },
    ]);
    expect(client.chats().find((chat) => chat.id === 'l')?.ended).toBe(true);
  });

  it('shows who is typing in each chat until they send, leave or go quiet', () => {
    ready();
    client.join('one');
    server.receive({ type: 'typing', room: 'one', ...ana });
    server.receive({ type: 'typing', room: 'one', ...luis });
    expect(client.active()?.typing).toEqual([ana, luis]);

    server.receive({ type: 'message', room: 'one', ...ana, text: 'hola' });
    expect(client.active()?.typing).toEqual([luis]);

    vi.advanceTimersByTime(3000);
    expect(client.active()?.typing).toEqual([]);
  });

  it('signals your typing at most every 2 seconds per chat', () => {
    ready();
    client.join('one');
    server.sent = [];
    client.sendTyping('one');
    client.sendTyping('one');
    expect(server.sent).toEqual([{ type: 'typing', room: 'one' }]);

    vi.advanceTimersByTime(2000);
    client.sendTyping('one');
    expect(server.sent).toHaveLength(2);

    client.send('one', 'hola');
    expect(server.sent.at(-1)).toEqual({ type: 'message', room: 'one', text: 'hola' });
    client.sendTyping('one');
    expect(server.sent.at(-1)).toEqual({ type: 'typing', room: 'one' });
  });

  it('sends files in base64 and refuses the ones over 5 MB', async () => {
    vi.useRealTimers();
    ready();
    client.join('one');
    server.sent = [];
    const big = new File(['x'], 'big.bin');
    Object.defineProperty(big, 'size', { value: fileMaxBytes + 1 });

    client.sendFiles('one', [new File(['hola'], 'notes.txt'), big]);
    expect(TestBed.inject(Notice).text()).toBe('Files up to 5 MB.');
    await vi.waitFor(() =>
      expect(server.sent).toEqual([
        { type: 'file', room: 'one', name: 'notes.txt', data: btoa('hola') },
      ]),
    );
  });

  it('turns a received file into a link and lets it go with the chat', () => {
    const createObjectURL = vi.fn(() => 'blob:photo');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    ready();
    client.join('one');
    server.receive({
      type: 'message',
      room: 'one',
      ...ana,
      file: { kind: 'image', name: 'a.png', mime: 'image/png', size: 4, data: btoa('hola') },
    });

    const [event] = client.active()!.events;
    expect(event).toMatchObject({
      text: '',
      file: { kind: 'image', name: 'a.png', size: 4, url: 'blob:photo' },
    });
    expect((createObjectURL.mock.calls[0] as unknown[])[0]).toMatchObject({
      type: 'image/png',
      size: 4,
    });

    client.remove('one');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  });
});
