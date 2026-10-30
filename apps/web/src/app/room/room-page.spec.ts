import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RoomPage } from './room-page';
import { EchoSocket, SocketStatus } from './echo-socket';

describe('RoomPage', () => {
  const sent: string[] = [];
  const fakeSocket = {
    status: signal<SocketStatus>('open'),
    messages: signal(['hola', 'segundo']),
    send: (text: string) => sent.push(text),
  };
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    sent.length = 0;
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await TestBed.configureTestingModule({
      imports: [RoomPage],
      providers: [{ provide: EchoSocket, useValue: fakeSocket }],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(RoomPage);
    fixture.componentRef.setInput('id', 'abc');
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

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

  it('shows the connection status and the received messages', async () => {
    const { page } = await render();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Connected');
    const items = [...page.querySelectorAll('li')].map((li) => li.textContent?.trim());
    expect(items).toEqual(['hola', 'segundo']);
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
