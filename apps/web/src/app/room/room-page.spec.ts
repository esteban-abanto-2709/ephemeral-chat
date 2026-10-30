import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RoomPage } from './room-page';
import { ChatMessage, RoomSocket, SocketStatus } from './room-socket';

describe('RoomPage', () => {
  const sent: string[] = [];
  const fakeSocket = {
    status: signal<SocketStatus>('open'),
    messages: signal<ChatMessage[]>([
      { name: 'Ana', text: 'hola' },
      { name: 'Juan', text: 'segundo' },
    ]),
    connect: vi.fn(),
    send: (text: string) => sent.push(text),
  };
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    sent.length = 0;
    fakeSocket.connect.mockClear();
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await TestBed.configureTestingModule({ imports: [RoomPage] })
      .overrideComponent(RoomPage, {
        set: { providers: [{ provide: RoomSocket, useValue: fakeSocket }] },
      })
      .compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(RoomPage);
    fixture.componentRef.setInput('id', 'abc');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    const name = page.querySelector('#name') as HTMLInputElement;
    name.value = 'Juan';
    name.dispatchEvent(new Event('input'));
    page.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    return { fixture, page };
  }

  it('asks for a name before showing the room', async () => {
    const fixture = TestBed.createComponent(RoomPage);
    fixture.componentRef.setInput('id', 'abc');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('dialog')?.open).toBe(true);
    expect(page.querySelector('#message')).toBeNull();
    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });

  it('joins the room with the chosen name', async () => {
    const { page } = await render();
    expect(page.querySelector('dialog')).toBeNull();
    expect(page.textContent).toContain('You are Juan');
    expect(fakeSocket.connect).toHaveBeenCalledWith('abc', 'Juan');
  });

  it('shows the room link and copies it', async () => {
    const { fixture, page } = await render();
    const link = page.querySelector('#room-link') as HTMLInputElement;
    expect(link.value).toBe(`${location.origin}/room/abc`);

    const copy = [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Copy'))!;
    copy.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(`${location.origin}/room/abc`);
    expect(copy.textContent).toContain('Copied');
  });

  it('shows the connection status and each message with its sender', async () => {
    const { page } = await render();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Connected');
    const items = [...page.querySelectorAll('li')].map((li) => [
      li.querySelector('strong')?.textContent,
      li.querySelector('span')?.textContent,
    ]);
    expect(items).toEqual([
      ['Ana', 'hola'],
      ['Juan', 'segundo'],
    ]);
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
