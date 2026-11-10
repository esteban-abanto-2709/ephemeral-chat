import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Notice } from '../notice';
import { ChatClient, fileMaxBytes, maxChats } from './chat-client';
import { decodeFrame, encodeFrame } from './frame';

class FakeWebSocket {
  static readonly OPEN = 1;
  static last: FakeWebSocket;
  readyState = FakeWebSocket.OPEN;
  sent: object[] = [];
  binary: Blob[] = [];
  binaryType = 'blob';
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (message: { data: string | ArrayBuffer }) => void;

  constructor(readonly url: string) {
    FakeWebSocket.last = this;
  }

  send(data: string | Blob): void {
    if (typeof data === 'string') {
      this.sent.push(JSON.parse(data));
    } else {
      this.binary.push(data);
    }
  }

  close(): void {}

  receive(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  async receiveBinary(header: object, bytes: Uint8Array): Promise<void> {
    const blob = encodeFrame(header, new Blob([bytes as BlobPart]));
    this.onmessage?.({ data: await blob.arrayBuffer() });
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

  async function lastFile(): Promise<{ header: unknown; bytes: number[] }> {
    const { header, data } = decodeFrame(await server.binary.at(-1)!.arrayBuffer());
    expect(server.sent.some((frame) => (frame as { type: string }).type === 'file')).toBe(false);
    return { header, bytes: Array.from(data) };
  }

  const bytesOf = (text: string): number[] => Array.from(new TextEncoder().encode(text));

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

  it('quotes a reply from its own copy of the original, or as an earlier message', () => {
    ready();
    client.join('one');
    server.receive({ type: 'message', room: 'one', ...ana, text: 'Saturday?', seq: 1 });
    server.receive({ type: 'message', room: 'one', ...juan, text: 'Works', seq: 2, reply: 1 });
    server.receive({ type: 'message', room: 'one', ...ana, text: 'Sure', seq: 3, reply: 9 });

    const [, works, sure] = client.active()!.events;
    expect(works).toMatchObject({
      seq: 2,
      reply: { name: 'Ana', own: false, text: 'Saturday?', seq: 1 },
    });
    expect(sure).toMatchObject({ reply: { name: '', text: '' } });

    client.send('one', 'me too', 1);
    expect(server.sent.at(-1)).toEqual({ type: 'message', room: 'one', text: 'me too', reply: 1 });
  });

  it('drops a chat the server refuses and says why', () => {
    ready();
    client.join('gone');
    server.receive({ type: 'error', room: 'gone', code: 'gone' });
    expect(client.chats()).toEqual([]);
    expect(client.active()).toBeNull();
    expect(TestBed.inject(Notice).text()).toContain('is gone');
  });

  it('keeps the chat when the server only asks to slow down', () => {
    ready();
    client.join('one');
    server.receive({ type: 'error', room: 'one', code: 'slow-messages' });
    expect(client.active()?.events).toEqual([
      { type: 'error', code: 'slow-messages', at: expect.any(Number) },
    ]);
    expect(TestBed.inject(Notice).text()).toBeNull();
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

  it('sends files in binary frames and refuses the ones over 5 MB', async () => {
    vi.useRealTimers();
    ready();
    client.join('one');
    server.sent = [];
    const big = new File(['x'], 'big.bin');
    Object.defineProperty(big, 'size', { value: fileMaxBytes + 1 });

    await client.sendFiles('one', [
      { file: new File(['hola'], 'notes.txt'), caption: '' },
      { file: big, caption: '' },
    ]);
    expect(TestBed.inject(Notice).text()).toBe('Files up to 5 MB.');
    expect(server.binary).toHaveLength(1);
    expect(await lastFile()).toEqual({
      header: { type: 'file', room: 'one', name: 'notes.txt' },
      bytes: bytesOf('hola'),
    });
  });

  it('holds picked files for review and sends the ones kept, with their captions', async () => {
    vi.useRealTimers();
    let count = 0;
    const createObjectURL = vi.fn(() => `blob:${++count}`);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    ready();
    client.join('one');
    server.sent = [];

    client.pick('one', [new File(['hola'], 'notes.txt')]);
    client.pick('one', [new File(['png'], 'a.png', { type: 'image/png' })]);
    expect(server.sent).toEqual([]);
    const [notes, photo] = client.picked();
    expect(notes).toMatchObject({ kind: 'file', name: 'notes.txt', url: 'blob:1' });
    expect(photo).toMatchObject({ kind: 'image', name: 'a.png', url: 'blob:2' });

    client.open(null);
    expect(client.picked()).toEqual([]);
    client.open('one');

    await client.sendPicked([{ file: notes, caption: ' for Saturday ' }], true);
    expect(client.picked()).toEqual([]);
    expect(revokeObjectURL.mock.calls).toEqual([['blob:1'], ['blob:2']]);
    expect(await lastFile()).toEqual({
      header: { type: 'file', room: 'one', name: 'notes.txt', text: 'for Saturday' },
      bytes: bytesOf('hola'),
    });

    client.pick('one', [new File(['hola'], 'notes.txt')]);
    client.discardPicked();
    expect(revokeObjectURL).toHaveBeenLastCalledWith('blob:3');
    expect(client.picked()).toEqual([]);
  });

  it('sends a voice message with its length and plays a received one as audio', async () => {
    vi.useRealTimers();
    const createObjectURL = vi.fn(() => 'blob:voice');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    ready();
    client.join('one');
    server.sent = [];

    client.sendVoice('one', new Blob(['hola'], { type: 'audio/webm;codecs=opus' }), 12, 3);
    expect(await lastFile()).toEqual({
      header: { type: 'file', room: 'one', name: 'voice.webm', seconds: 12, reply: 3 },
      bytes: bytesOf('hola'),
    });

    await server.receiveBinary(
      {
        type: 'message',
        room: 'one',
        ...ana,
        file: { kind: 'voice', name: 'voice.m4a', mime: 'audio/mp4', size: 4, seconds: 7 },
      },
      new TextEncoder().encode('hola'),
    );
    expect(client.active()!.events.at(-1)).toMatchObject({
      file: { kind: 'voice', seconds: 7, url: 'blob:voice' },
    });
    expect((createObjectURL.mock.calls[0] as unknown[])[0]).toMatchObject({ type: 'audio/mp4' });

    const big = new Blob(['x']);
    Object.defineProperty(big, 'size', { value: 1024 * 1024 + 1 });
    client.sendVoice('one', big, 60);
    expect(TestBed.inject(Notice).text()).toBe('Voice messages up to 1 MB.');
  });

  it('turns a received file into a link and lets it go with the chat', async () => {
    vi.useRealTimers();
    const createObjectURL = vi.fn(() => 'blob:photo');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    ready();
    client.join('one');
    await server.receiveBinary(
      {
        type: 'message',
        room: 'one',
        ...ana,
        file: { kind: 'image', name: 'a.png', mime: 'image/png', size: 4 },
      },
      new TextEncoder().encode('hola'),
    );

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

  it('shows a file received in a binary frame', async () => {
    vi.useRealTimers();
    const createObjectURL = vi.fn(() => 'blob:bin');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    ready();
    client.join('one');
    await server.receiveBinary(
      {
        type: 'message',
        room: 'one',
        ...ana,
        file: { kind: 'file', name: 'notes.txt', size: 4 },
      },
      new TextEncoder().encode('hola'),
    );

    expect(client.active()!.events.at(-1)).toMatchObject({
      own: false,
      file: { kind: 'file', name: 'notes.txt', size: 4, url: 'blob:bin' },
    });
    const blob = (createObjectURL.mock.calls[0] as unknown[])[0] as Blob;
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual(bytesOf('hola'));
  });

  it('shows your own file from the local copy when the server confirms it', async () => {
    vi.useRealTimers();
    const createObjectURL = vi.fn((blob: Blob) => `blob:${blob.size}`);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    ready();
    client.join('one');
    await client.sendFiles('one', [{ file: new File(['hola'], ' notes.txt '), caption: '' }]);
    expect(await lastFile()).toMatchObject({ header: { name: 'notes.txt' } });

    server.receive({
      type: 'message',
      room: 'one',
      ...juan,
      file: { kind: 'file', name: 'notes.txt', size: 4 },
    });
    expect(client.active()!.events.at(-1)).toMatchObject({
      own: true,
      file: { kind: 'file', name: 'notes.txt', size: 4, url: 'blob:4' },
    });
    expect((createObjectURL.mock.calls[0] as unknown[])[0]).toMatchObject({
      type: 'application/octet-stream',
    });
  });
});
