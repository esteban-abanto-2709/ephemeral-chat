import { DOCUMENT, OnDestroy, Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Notice } from '../notice';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface Person {
  id: string;
  name: string;
}

export type ChatEvent = (
  | { type: 'message'; id: string; name: string; text: string; own: boolean }
  | { type: 'joined' | 'left'; id: string; name: string; members: Person[] }
  | { type: 'error'; text: string }
) & { at: number };

export interface Chat {
  id: string;
  title: string;
  events: ChatEvent[];
  members: Person[];
  typing: Person[];
  unread: number;
  at: number;
}

interface Frame {
  type: string;
  room?: string;
  id?: string;
  name?: string;
  title?: string;
  text?: string;
  code?: string;
  members?: Person[];
}

export const maxChats = 20;
const typingShownFor = 3000;
const typingSentEvery = 2000;

const failures: Record<string, string> = {
  gone: "That group doesn't exist anymore.",
  full: 'That group is full: it already has 50 people.',
  limit: `You're in ${maxChats} chats, the most a tab can hold.`,
};

@Service({ autoProvided: false })
export class ChatClient implements OnDestroy {
  private readonly _status = signal<SocketStatus>('connecting');
  private readonly _name = signal<string | null>(null);
  private readonly _me = signal('');
  private readonly _chats = signal<Chat[]>([]);
  private readonly _active = signal<string | null>(null);
  readonly status = this._status.asReadonly();
  readonly name = this._name.asReadonly();
  readonly me = this._me.asReadonly();
  readonly chats = computed(() =>
    [...this._chats()].sort((a, b) => (b.events.at(-1)?.at ?? b.at) - (a.events.at(-1)?.at ?? a.at)),
  );
  readonly active = computed(() => this._chats().find((chat) => chat.id === this._active()) ?? null);

  private readonly http = inject(HttpClient);
  private readonly notice = inject(Notice);
  private readonly location = inject(DOCUMENT).location;
  private socket?: WebSocket;
  private ready = false;
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly typingSentAt = new Map<string, number>();

  connect(name: string): void {
    const scheme = this.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${scheme}://${this.location.host}/api/ws?name=${encodeURIComponent(name)}`);
    this._name.set(name);
    this._status.set('connecting');
    this.ready = false;
    this.clearTyping();
    socket.onopen = () => this._status.set('open');
    socket.onclose = () => {
      this._status.set('closed');
      this.ready = false;
    };
    socket.onmessage = (message: MessageEvent<string>) => this.receive(JSON.parse(message.data));
    this.socket = socket;
  }

  reconnect(): void {
    const name = this._name();
    if (name) {
      this.connect(name);
    }
  }

  create(title: string): void {
    this.http.post<{ id: string }>('/api/rooms', { name: title }).subscribe({
      next: ({ id }) => this.join(id, title),
      error: () => this.notice.show("Couldn't create the group. Try again."),
    });
  }

  join(id: string, title = ''): void {
    if (this._chats().some((chat) => chat.id === id)) {
      this.open(id);
      return;
    }
    if (this._chats().length >= maxChats) {
      this.notice.show(failures['limit']);
      return;
    }
    this._chats.update((chats) => [
      ...chats,
      { id, title, events: [], members: [], typing: [], unread: 0, at: Date.now() },
    ]);
    this.open(id);
    if (this.ready) {
      this.write({ type: 'join', room: id });
    }
  }

  open(id: string | null): void {
    this._active.set(id);
    if (id) {
      this.update(id, (chat) => ({ ...chat, unread: 0 }));
    }
  }

  send(room: string, text: string): void {
    this.write({ type: 'message', room, text });
    this.typingSentAt.delete(room);
  }

  sendTyping(room: string): void {
    const now = Date.now();
    if (!this.ready || now - (this.typingSentAt.get(room) ?? 0) < typingSentEvery) {
      return;
    }
    this.typingSentAt.set(room, now);
    this.write({ type: 'typing', room });
  }

  ngOnDestroy(): void {
    this.clearTyping();
    this.socket?.close();
  }

  private write(frame: Frame): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(frame));
    }
  }

  private receive(frame: Frame): void {
    if (frame.type === 'ready') {
      this._me.set(frame.id!);
      this.ready = true;
      this._chats().forEach((chat) => this.write({ type: 'join', room: chat.id }));
      return;
    }
    const room = frame.room!;
    if (frame.type === 'error' && frame.code) {
      this.notice.show(failures[frame.code] ?? failures['gone']);
      this._chats.update((chats) => chats.filter((chat) => chat.id !== room));
      if (this._active() === room) {
        this._active.set(null);
      }
      return;
    }
    if (frame.type === 'typing') {
      this.startTyping(room, { id: frame.id!, name: frame.name! });
      return;
    }
    const at = Date.now();
    const event = (
      frame.type === 'message'
        ? { type: 'message', id: frame.id, name: frame.name, text: frame.text, own: frame.id === this._me(), at }
        : frame.type === 'error'
          ? { type: 'error', text: frame.text, at }
          : { type: frame.type, id: frame.id, name: frame.name, members: frame.members, at }
    ) as ChatEvent;
    if (event.type === 'message' || event.type === 'left') {
      this.stopTyping(room, event.id);
    }
    this.update(room, (chat) => ({
      ...chat,
      title: frame.title || chat.title,
      members: event.type === 'joined' || event.type === 'left' ? event.members : chat.members,
      events: [...chat.events, event],
      unread: event.type === 'message' && !event.own && this._active() !== room ? chat.unread + 1 : chat.unread,
    }));
  }

  private update(id: string, change: (chat: Chat) => Chat): void {
    this._chats.update((chats) => chats.map((chat) => (chat.id === id ? change(chat) : chat)));
  }

  private startTyping(room: string, person: Person): void {
    const key = `${room} ${person.id}`;
    clearTimeout(this.typingTimers.get(key));
    this.typingTimers.set(key, setTimeout(() => this.stopTyping(room, person.id), typingShownFor));
    this.update(room, (chat) =>
      chat.typing.some(({ id }) => id === person.id) ? chat : { ...chat, typing: [...chat.typing, person] },
    );
  }

  private stopTyping(room: string, id: string): void {
    const key = `${room} ${id}`;
    clearTimeout(this.typingTimers.get(key));
    this.typingTimers.delete(key);
    this.update(room, (chat) =>
      chat.typing.some((person) => person.id === id)
        ? { ...chat, typing: chat.typing.filter((person) => person.id !== id) }
        : chat,
    );
  }

  private clearTyping(): void {
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();
    this._chats.update((chats) => chats.map((chat) => ({ ...chat, typing: [] })));
  }
}
