import { TestBed } from '@angular/core/testing';
import { MessageList } from './message-list';
import { ChatEvent } from '../../chats/chat-client';
import { I18n } from '../../i18n/i18n';

const ana = { id: 'a', name: 'Ana' };
const juan = { id: 'j', name: 'Juan' };

describe('MessageList', () => {
  const at = new Date(2026, 10, 3, 21, 4).getTime();

  async function render(events: ChatEvent[]) {
    const fixture = TestBed.createComponent(MessageList);
    fixture.componentRef.setInput('events', events);
    fixture.componentRef.setInput('title', 'Weekend trip');
    fixture.componentRef.setInput('code', 'abc');
    await fixture.whenStable();
    const list = fixture.nativeElement as HTMLElement;
    return { fixture, list, items: [...list.querySelectorAll('ul[aria-live] li')] };
  }

  it('says who joined or left and why it held a message back, in Spanish', async () => {
    TestBed.inject(I18n).use('es');
    const { items } = await render([
      { type: 'joined', ...ana, members: [ana], at },
      { type: 'left', ...ana, members: [], at },
      { type: 'error', code: 'slow-files', at },
      { type: 'message', ...juan, own: true, text: 'hola', at },
    ]);

    expect(items.map((li) => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Ana se unió',
      'Ana salió',
      'Más despacio: un archivo cada 2 segundos.',
      expect.stringMatching(/^Tú:\s?hola 21:04$/),
    ]);
  });

  it('shows messages, who joined or left and warnings', async () => {
    const { items } = await render([
      { type: 'joined', ...ana, members: [ana], at },
      { type: 'message', ...ana, own: false, text: 'hola', at },
      { type: 'left', ...ana, members: [], at },
      { type: 'error', code: 'slow-messages', at },
    ]);

    expect(items.map((li) => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Ana joined',
      'Ana hola 21:04',
      'Ana left',
      'Slow down: up to 5 messages per second.',
    ]);
    expect(items[3].getAttribute('role')).toBe('alert');
  });

  it('opens with the group name, its code and a reminder that nothing is stored', async () => {
    const { list } = await render([]);
    const about = list.querySelector('[aria-label="About this chat"]')!;

    expect(about.querySelector('h2')?.textContent).toContain('Weekend trip');
    expect(about.textContent).toContain('Nothing is stored');
    expect(about.querySelector('[aria-label="Copy group code"]')?.textContent).toContain('abc');
  });

  it('puts your messages on the right and groups messages in a row', async () => {
    const { items } = await render([
      { type: 'message', ...ana, own: false, text: 'uno', at },
      { type: 'message', ...ana, own: false, text: 'dos', at },
      { type: 'message', ...juan, own: true, text: 'tres', at },
    ]);

    const names = items.map((li) => li.querySelector('p'));
    expect(names[0]?.classList.contains('sr-only')).toBe(false);
    expect(names[1]?.classList.contains('sr-only')).toBe(true);
    expect(items[2].classList.contains('self-end')).toBe(true);
    expect(items[2].textContent).toContain('You:');
  });

  it('hides the keyboard when you drag the messages', async () => {
    const { list } = await render([]);
    const input = document.body.appendChild(document.createElement('input'));
    input.focus();

    list.firstElementChild!.dispatchEvent(new Event('touchmove'));

    expect(document.activeElement).not.toBe(input);
    input.remove();
  });

  it('follows new messages unless you are reading above', async () => {
    const first: ChatEvent = { type: 'message', ...ana, own: false, text: 'uno', at };
    const { fixture, list } = await render([first]);
    const scroller = list.firstElementChild as HTMLElement;
    Object.defineProperty(scroller, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(scroller, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true, configurable: true });

    fixture.componentRef.setInput('events', [first, { ...first, text: 'dos' }]);
    await fixture.whenStable();
    expect(scroller.scrollTop).toBe(1000);

    scroller.scrollTop = 100;
    scroller.dispatchEvent(new Event('scroll'));
    fixture.componentRef.setInput('events', [first, { ...first, text: 'tres' }]);
    await fixture.whenStable();
    expect(scroller.scrollTop).toBe(100);

    fixture.componentRef.setInput('events', [first, { ...first, ...juan, own: true, text: 'mío' }]);
    await fixture.whenStable();
    expect(scroller.scrollTop).toBe(1000);
  });
});
