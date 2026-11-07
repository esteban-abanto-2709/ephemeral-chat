import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Attachment } from './attachment';
import { Chat, ChatClient, SocketStatus } from './chat-client';
import { ChatsPage } from './chats-page';

const juan = { id: 'j', name: 'Juan' };
const ana = { id: 'a', name: 'Ana' };

describe('ChatsPage', () => {
  const chats = signal<Chat[]>([]);
  const activeId = signal<string | null>(null);
  const name = signal<string | null>(null);
  const picked = signal<Attachment[]>([]);
  const fakeClient = {
    status: signal<SocketStatus>('open'),
    name,
    me: signal('j'),
    chats,
    active: computed(() => chats().find((chat) => chat.id === activeId()) ?? null),
    connect: vi.fn((chosen: string) => name.set(chosen)),
    join: vi.fn(),
    open: vi.fn((id: string | null) => activeId.set(id)),
    create: vi.fn(),
    send: vi.fn(),
    sendTyping: vi.fn(),
    picked,
    pick: vi.fn(),
    sendPicked: vi.fn(),
    discardPicked: vi.fn(),
    reconnect: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    name.set(null);
    activeId.set(null);
    picked.set([]);
    fakeClient.status.set('open');
    chats.set([
      {
        id: 'trip',
        kind: 'group',
        ended: false,
        title: 'Weekend trip',
        events: [{ type: 'message', ...ana, own: false, text: 'hola', at: 0 }],
        members: [juan, ana],
        typing: [],
        unread: 0,
        at: 0,
      },
    ]);
    await TestBed.configureTestingModule({ imports: [ChatsPage] })
      .overrideComponent(ChatsPage, {
        set: { providers: [{ provide: ChatClient, useValue: fakeClient }] },
      })
      .compileComponents();
  });

  async function render(id?: string) {
    const fixture = TestBed.createComponent(ChatsPage);
    if (id) {
      fixture.componentRef.setInput('id', id);
    }
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    async function submitName(value: string) {
      const input = page.querySelector('#name') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.form!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    }
    return { fixture, page, submitName };
  }

  it('asks for a name before connecting', async () => {
    const { page } = await render();
    expect(page.querySelector('dialog')?.open).toBe(true);
    expect(fakeClient.connect).not.toHaveBeenCalled();
  });

  it('connects with the name, joins the chat from the link and clears the address', async () => {
    fakeClient.join.mockImplementation((id: string) => activeId.set(id));
    const replaceState = vi.spyOn(TestBed.inject(Location), 'replaceState');
    const { page, submitName } = await render('trip');
    await submitName('Juan');
    expect(fakeClient.connect).toHaveBeenCalledWith('Juan');
    expect(fakeClient.join).toHaveBeenCalledWith('trip');
    expect(replaceState).toHaveBeenCalledWith('/');
    expect(page.querySelector('dialog')).toBeNull();
    expect(document.activeElement?.id).toBe('message');
  });

  it('creates a named group', async () => {
    const { fixture, page, submitName } = await render();
    await submitName('Juan');
    (page.querySelector('[aria-label="New group"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(page.querySelector('#name-title')?.textContent).toContain('New group');

    await submitName('Weekend trip');
    expect(fakeClient.create).toHaveBeenCalledWith('Weekend trip');
  });

  async function openChat() {
    const rendered = await render();
    await rendered.submitName('Juan');
    (rendered.page.querySelector('[aria-label="Your chats"] button') as HTMLButtonElement).click();
    await rendered.fixture.whenStable();
    return rendered;
  }

  it('opens a chat with who is in it and its messages', async () => {
    const { page } = await openChat();
    expect(page.querySelector('h1')?.textContent).toContain('Weekend trip');
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Ana, you');
    expect(page.querySelector('[aria-label="Messages"]')?.textContent).toContain('hola');
  });

  it('says who is typing and signals your own typing', async () => {
    const { fixture, page } = await openChat();
    chats.update(([chat]) => [{ ...chat, typing: [ana, juan, { id: 'e', name: 'Eva' }] }]);
    await fixture.whenStable();
    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Ana and 2 more are typing…',
    );

    const input = page.querySelector('#message') as HTMLInputElement;
    input.value = 'h';
    input.dispatchEvent(new Event('input'));
    expect(fakeClient.sendTyping).toHaveBeenCalledWith('trip');
  });

  it('sends the typed text, clears the input and caps it near the limit', async () => {
    const { fixture, page } = await openChat();
    const input = page.querySelector('#message') as HTMLInputElement;
    expect(input.maxLength).toBe(1000);

    input.value = 'x'.repeat(950);
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(page.querySelector('#message-length')?.textContent).toBe('950 / 1000');

    input.value = '  hola  ';
    input.form!.dispatchEvent(new Event('submit'));
    expect(fakeClient.send).toHaveBeenCalledWith('trip', 'hola', undefined);
    expect(input.value).toBe('');
  });

  it('replies to a message and jumps back to it from the quote', async () => {
    const { fixture, page } = await openChat();
    chats.update(([chat]) => [
      {
        ...chat,
        events: [{ type: 'message', ...ana, own: false, text: 'Saturday?', seq: 3, at: 0 }],
      },
    ]);
    await fixture.whenStable();
    const bubble = page.querySelector('[data-seq="3"]') as HTMLElement;
    const replyButton = bubble.querySelector('[aria-label="Reply"]') as HTMLButtonElement;
    bubble.click();
    await fixture.whenStable();
    expect(replyButton.classList).toContain('opacity-100!');

    replyButton.click();
    await fixture.whenStable();
    const input = page.querySelector('#message') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(page.querySelector('app-quote')?.textContent).toContain('Saturday?');

    input.value = 'Works for me';
    input.form!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(fakeClient.send).toHaveBeenCalledWith('trip', 'Works for me', 3);
    expect(page.querySelector('[aria-label="Cancel reply"]')).toBeNull();

    replyButton.click();
    await fixture.whenStable();
    (page.querySelector('[aria-label="Cancel reply"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(page.querySelector('[aria-label="Cancel reply"]')).toBeNull();

    chats.update(([chat]) => [
      {
        ...chat,
        events: [
          ...chat.events,
          {
            type: 'message',
            ...juan,
            own: true,
            text: 'Works for me',
            seq: 4,
            reply: { ...ana, own: false, text: 'Saturday?', seq: 3 },
            at: 0,
          },
        ],
      },
    ]);
    await fixture.whenStable();
    const scrollIntoView = vi.fn();
    (page.querySelector('[data-seq="3"]') as HTMLElement).scrollIntoView = scrollIntoView;
    (page.querySelector('[aria-label="Go to the message from Ana"]') as HTMLButtonElement).click();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('opens a photo over the chat and closes it with Escape', async () => {
    const { fixture, page } = await openChat();
    chats.update(([chat]) => [
      {
        ...chat,
        events: [
          {
            type: 'message',
            ...ana,
            own: false,
            text: 'Sunset',
            file: { kind: 'image', name: 'ridge.jpg', size: 4, url: 'blob:ridge' },
            at: 0,
          },
        ],
      },
    ]);
    await fixture.whenStable();
    (page.querySelector('[aria-label="Messages"] button img') as HTMLImageElement).click();
    await fixture.whenStable();
    const viewer = page.querySelector('app-photo-viewer dialog') as HTMLDialogElement;
    expect(viewer.open).toBe(true);
    expect(viewer.textContent).toContain('Ana');
    expect(viewer.textContent).toContain('Sunset');
    expect(viewer.querySelector('a[download]')?.getAttribute('href')).toBe('blob:ridge');

    viewer.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(page.querySelector('app-photo-viewer')).toBeNull();
    expect(fakeClient.open).not.toHaveBeenCalledWith(null);
  });

  it('reviews the files picked with the clip before sending them', async () => {
    const { fixture, page } = await openChat();
    const picker = page.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hola'], 'notes.txt');
    Object.defineProperty(picker, 'files', { value: [file] });
    picker.dispatchEvent(new Event('change'));
    expect(fakeClient.pick).toHaveBeenCalledWith('trip', [file]);

    const preview: Attachment = { kind: 'file', name: 'notes.txt', size: 4, url: 'blob:1' };
    picked.set([preview]);
    await fixture.whenStable();
    const caption = page.querySelector('#caption') as HTMLInputElement;
    caption.value = 'for Saturday';
    caption.dispatchEvent(new Event('input'));
    caption.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(fakeClient.open).not.toHaveBeenCalledWith(null);

    (page.querySelector('[aria-label="Send 1 file"]') as HTMLButtonElement).click();
    expect(fakeClient.sendPicked).toHaveBeenCalledWith(
      [{ file: preview, caption: 'for Saturday' }],
      false,
    );
    [...page.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Discard')!.click();
    expect(fakeClient.discardPicked).toHaveBeenCalled();
  });

  it('offers to reconnect when the connection drops', async () => {
    const { fixture, page } = await openChat();
    fakeClient.status.set('closed');
    await fixture.whenStable();
    [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Reconnect'))!.click();
    expect(fakeClient.reconnect).toHaveBeenCalled();
  });

  it('shows a private chat as read-only once the other one leaves', async () => {
    const { fixture, page } = await openChat();
    chats.update(([chat]) => [{ ...chat, kind: 'private', title: 'Ana', members: [juan, ana] }]);
    await fixture.whenStable();
    expect(page.querySelector('header [role="status"]')?.textContent).toContain('Online');
    expect(page.querySelector('[aria-label="Copy group link"]')).toBeNull();
    expect(page.querySelector('[aria-label="About this chat"] h2')?.textContent).toContain(
      'Private chat with Ana',
    );

    chats.update(([chat]) => [{ ...chat, ended: true }]);
    await fixture.whenStable();
    expect(page.querySelector('#message')).toBeNull();
    expect(page.querySelector('header [role="status"]')?.textContent).toContain('Left the chat');
    [...page.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Delete chat'))!
      .click();
    expect(fakeClient.remove).toHaveBeenCalledWith('trip');
  });

  it('goes back to the list with Escape', async () => {
    const { fixture, page } = await openChat();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(fakeClient.open).toHaveBeenLastCalledWith(null);
    expect(page.querySelector('#message')).toBeNull();
  });
});
