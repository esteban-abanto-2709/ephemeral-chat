import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RoomPage } from './room-page';
import { RoomEvent, RoomSocket, SocketStatus } from './room-socket';

describe('RoomPage', () => {
  const sent: string[] = [];
  const fakeSocket = {
    status: signal<SocketStatus>('open'),
    events: signal<RoomEvent[]>([{ type: 'message', name: 'Ana', text: 'hola', at: 0 }]),
    members: signal(['Juan', 'Luis']),
    typing: signal<string[]>([]),
    sendTyping: vi.fn(),
    nameTaken: signal(false),
    roomGone: signal(false),
    roomFull: signal(false),
    connect: vi.fn(),
    send: (text: string) => sent.push(text),
  };

  beforeEach(async () => {
    sent.length = 0;
    fakeSocket.connect.mockClear();
    fakeSocket.status.set('open');
    fakeSocket.nameTaken.set(false);
    fakeSocket.roomGone.set(false);
    fakeSocket.roomFull.set(false);
    await TestBed.configureTestingModule({
      imports: [RoomPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideComponent(RoomPage, {
        set: { providers: [{ provide: RoomSocket, useValue: fakeSocket }] },
      })
      .compileComponents();
  });

  async function open(status = 204) {
    const fixture = TestBed.createComponent(RoomPage);
    fixture.componentRef.setInput('id', 'abc');
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/rooms/abc')
      .flush(null, { status, statusText: status === 204 ? 'No Content' : 'Not Found' });
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  async function render() {
    const { fixture, page } = await open();

    const name = page.querySelector('#name') as HTMLInputElement;
    name.value = 'Juan';
    name.dispatchEvent(new Event('input'));
    page.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    return { fixture, page };
  }

  it('says so when the room does not exist', async () => {
    const { page } = await open(404);
    expect(page.querySelector('h1')?.textContent).toContain('Room not found');
    expect(page.querySelector('a')?.getAttribute('href')).toBe('/');
    expect(page.querySelector('dialog')).toBeNull();
  });

  it('says so when the room is dropped before joining', async () => {
    const { fixture, page } = await render();
    fakeSocket.roomGone.set(true);
    await fixture.whenStable();
    expect(page.querySelector('h1')?.textContent).toContain('Room not found');
  });

  it('says so when the room is full', async () => {
    const { fixture, page } = await render();
    fakeSocket.roomFull.set(true);
    await fixture.whenStable();
    expect(page.querySelector('h1')?.textContent).toContain('Room is full');
    expect(page.querySelector('#message')).toBeNull();
  });

  it('asks for a name before showing the room', async () => {
    const { page } = await open();

    expect(page.querySelector('dialog')?.open).toBe(true);
    expect(page.querySelector('#message')).toBeNull();
    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });

  it('joins the room with the chosen name', async () => {
    const { page } = await render();
    expect(page.querySelector('dialog')).toBeNull();
    expect(page.querySelector('[aria-label="People in the room"]')?.textContent).toContain('you');
    expect(fakeSocket.connect).toHaveBeenCalledWith('abc', 'Juan');
  });

  it('asks again when the name is taken', async () => {
    const { fixture, page } = await render();

    fakeSocket.nameTaken.set(true);
    await fixture.whenStable();

    expect(page.querySelector('dialog')?.open).toBe(true);
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Juan is already in this room');
    expect(page.querySelector('#message')).toBeNull();
  });

  it('shows the connection status and the messages', async () => {
    const { page } = await render();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Connected');
    expect(page.querySelector('[aria-label="Messages"]')?.textContent).toContain('hola');
  });

  it('offers to reconnect when the connection drops', async () => {
    const { fixture, page } = await render();
    expect(page.textContent).not.toContain('Reconnect');

    fakeSocket.status.set('closed');
    await fixture.whenStable();
    const reconnect = [...page.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Reconnect'),
    )!;
    reconnect.click();

    expect(fakeSocket.connect).toHaveBeenLastCalledWith('abc', 'Juan');
    expect(fakeSocket.connect).toHaveBeenCalledTimes(2);

    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/rooms/abc')
      .flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(page.querySelector('h1')?.textContent).toContain('Room not found');
  });

  it('shows who is in the room in the panel', async () => {
    const { page } = await render();

    expect(page.querySelector('#members-title')?.textContent).toContain('In this room · 2');
  });

  it('caps the message and shows a counter near the limit', async () => {
    const { fixture, page } = await render();
    const input = page.querySelector('#message') as HTMLInputElement;
    expect(input.maxLength).toBe(1000);

    input.value = 'x'.repeat(899);
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(page.querySelector('#message-length')).toBeNull();

    input.value = 'x'.repeat(950);
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(page.querySelector('#message-length')?.textContent).toBe('950 / 1000');

    page.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(page.querySelector('#message-length')).toBeNull();
  });

  it('says who is typing and signals your own typing', async () => {
    const { fixture, page } = await render();
    fakeSocket.typing.set(['Ana', 'Luis', 'Eva']);
    await fixture.whenStable();
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Ana and 2 more are typing…');
    fakeSocket.typing.set([]);

    const input = page.querySelector('#message') as HTMLInputElement;
    input.value = 'h';
    input.dispatchEvent(new Event('input'));
    expect(fakeSocket.sendTyping).toHaveBeenCalled();
  });

  it('sends the typed text and clears the input', async () => {
    const { page } = await render();
    const input = page.querySelector('#message') as HTMLInputElement;

    input.value = '  hola  ';
    page.querySelector('form')?.dispatchEvent(new Event('submit'));

    expect(sent).toEqual(['hola']);
    expect(input.value).toBe('');
  });
});
