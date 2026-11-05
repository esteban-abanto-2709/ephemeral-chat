import { TestBed } from '@angular/core/testing';
import { Chat } from '../chat-client';
import { ChatList, codeIn } from './chat-list';

const code = 'aB3xQ9mK2pLt7vRw4ZcN8e';

function chat(id: string, title: string, unread = 0): Chat {
  return {
    id,
    kind: 'group',
    ended: false,
    title,
    events: [{ type: 'message', id: 'a', name: 'Ana', text: `hi from ${title}`, own: false, at: 0 }],
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
    const titles = () => [...list.querySelectorAll('[aria-label="Your chats"] li')].map((li) => li.textContent);
    async function type(text: string) {
      const search = list.querySelector('#search') as HTMLInputElement;
      search.value = text;
      search.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    }
    return { fixture, list, opened, titles, type };
  }

  it('finds a code alone or inside a link', () => {
    expect(codeIn(code)).toBe(code);
    expect(codeIn(` https://ephemeral.chat/room/${code} `)).toBe(code);
    expect(codeIn('Weekend trip')).toBeNull();
  });

  it('shows each chat with its last message and unread count', async () => {
    const { titles } = await render();
    expect(titles()).toEqual([
      expect.stringContaining('Ana: hi from Weekend trip'),
      expect.stringMatching(/Book club.*3 unread/),
    ]);
  });

  it('filters by name and by unread', async () => {
    const { fixture, list, titles, type } = await render();
    await type('book');
    expect(titles()).toEqual([expect.stringContaining('Book club')]);

    await type('');
    [...list.querySelectorAll('[role="radio"]')].find((b) => b.textContent?.includes('Unread'))!.dispatchEvent(
      new Event('click'),
    );
    await fixture.whenStable();
    expect(titles()).toEqual([expect.stringContaining('Book club')]);
  });

  it('joins with a pasted link', async () => {
    const { list, opened, type } = await render();
    await type(`https://ephemeral.chat/room/${code}`);
    expect(list.textContent).toContain('Open this code');

    list.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(opened).toEqual([code]);
  });
});
