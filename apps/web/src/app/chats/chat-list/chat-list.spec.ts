import { TestBed } from '@angular/core/testing';
import { I18n } from '../../i18n/i18n';
import { Notice } from '../../notice';
import { Chat } from '../chat-client';
import { ChatList, codeIn } from './chat-list';

const code = 'aB3xQ9mK2pLt7vRw4ZcN8e';

function chat(id: string, title: string, unread = 0): Chat {
  return {
    id,
    kind: 'group',
    ended: false,
    title,
    events: [
      { type: 'message', id: 'a', name: 'Ana', text: `hi from ${title}`, own: false, at: 0 },
    ],
    members: [],
    typing: [],
    unread,
    at: 0,
  };
}

describe('ChatList', () => {
  async function render() {
    const fixture = TestBed.createComponent(ChatList);
    fixture.componentRef.setInput('chats', [chat('1', 'Weekend trip'), chat('2', 'Book club', 3)]);
    const opened: string[] = [];
    fixture.componentInstance.opened.subscribe((id) => opened.push(id));
    await fixture.whenStable();
    const list = fixture.nativeElement as HTMLElement;
    const titles = () => [...list.querySelectorAll('ul li')].map((li) => li.textContent);
    function submit(text: string) {
      const field = list.querySelector('#join') as HTMLInputElement;
      field.value = text;
      field.form!.dispatchEvent(new Event('submit', { cancelable: true }));
      return field;
    }
    return { fixture, list, opened, titles, submit };
  }

  it('finds a code alone or inside a link', () => {
    expect(codeIn(code)).toBe(code);
    expect(codeIn(` https://ephemeral.chat/room/${code} `)).toBe(code);
    expect(codeIn(`https://ephemeral.chat/chat/${code}`)).toBe(code);
    expect(codeIn(`https://elsewhere.com/x/${code}`)).toBeNull();
    expect(codeIn('Weekend trip')).toBeNull();
  });

  it('shows each chat with its last message and unread count', async () => {
    const { titles } = await render();
    expect(titles()).toEqual([
      expect.stringContaining('Ana: hi from Weekend trip'),
      expect.stringMatching(/Book club.*3 unread/),
    ]);
  });

  it('leaves the name out of a private chat, where it is the chat itself', async () => {
    const fixture = TestBed.createComponent(ChatList);
    fixture.componentRef.setInput('chats', [{ ...chat('3', 'Ana'), kind: 'private' }]);
    await fixture.whenStable();
    const row = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Your chats"] li',
    );
    expect(row?.textContent).toContain('hi from Ana');
    expect(row?.textContent).not.toContain('Ana:');
  });

  it('names what a media message holds', async () => {
    const fixture = TestBed.createComponent(ChatList);
    const voice = chat('4', 'Trip');
    voice.events = [
      {
        type: 'message',
        id: 'a',
        name: 'Ana',
        text: '',
        own: false,
        file: { kind: 'voice', name: 'voice.webm', size: 48_000, url: '', seconds: 72 },
        at: 0,
      },
    ];
    fixture.componentRef.setInput('chats', [voice]);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ana: Voice message (1:12)',
    );
  });

  it('filters unread chats', async () => {
    const { fixture, list, titles } = await render();
    [...list.querySelectorAll('[role="radio"]')]
      .find((b) => b.textContent?.includes('Unread'))!
      .dispatchEvent(new Event('click'));
    await fixture.whenStable();
    expect(titles()).toEqual([expect.stringContaining('Book club')]);
  });

  it('switches to Spanish without reloading, previews included', async () => {
    const { fixture, list, titles } = await render();
    fixture.componentRef.setInput('chats', [
      chat('1', 'Weekend trip'),
      { ...chat('2', 'Book club', 3), events: [{ ...chat('2', '').events[0], own: true }] },
    ]);
    await fixture.whenStable();

    TestBed.inject(I18n).use('es');
    await fixture.whenStable();

    expect(list.querySelector('[role="radiogroup"]')?.textContent).toContain('No leídos');
    expect(titles()).toEqual([
      expect.stringContaining('Ana: hi from Weekend trip'),
      expect.stringMatching(/Tú: hi from .*3 sin leer/),
    ]);
  });

  it('joins with a pasted code, link or ID and says when it is none', async () => {
    const { opened, submit } = await render();
    expect(submit(`https://ephemeral.chat/chat/${code}`).value).toBe('');
    expect(opened).toEqual([code]);

    expect(submit('Weekend trip').value).toBe('Weekend trip');
    expect(opened).toHaveLength(1);
    expect(TestBed.inject(Notice).text()).toBe("That's not a code, link or ID.");
  });
});
