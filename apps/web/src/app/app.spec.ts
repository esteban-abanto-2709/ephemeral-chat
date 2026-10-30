import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { App } from './app';
import { EchoSocket, SocketStatus } from './echo-socket';

describe('App', () => {
  const sent: string[] = [];
  const fakeSocket = {
    status: signal<SocketStatus>('open'),
    messages: signal(['hola', 'segundo']),
    send: (text: string) => sent.push(text),
  };

  beforeEach(async () => {
    sent.length = 0;
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: EchoSocket, useValue: fakeSocket }],
    }).compileComponents();
  });

  it('shows the connection status and the received messages', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Connected');
    const items = [...page.querySelectorAll('li')].map((li) => li.textContent?.trim());
    expect(items).toEqual(['hola', 'segundo']);
  });

  it('sends the typed text and clears the input', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const input = page.querySelector('input') as HTMLInputElement;

    input.value = '  hola  ';
    page.querySelector('form')?.dispatchEvent(new Event('submit'));

    expect(sent).toEqual(['hola']);
    expect(input.value).toBe('');
  });
});
