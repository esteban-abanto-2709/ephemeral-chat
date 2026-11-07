import { DOCUMENT, OnDestroy, Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Notice } from '../notice';
import { Attachment, Outgoing, Quote } from './attachment';
import { compressPhoto } from './compress-photo';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface Person {
  id: string;
  name: string;
}

export type ChatEvent = (
  | {
      type: 'message';
      id: string;
      name: string;
      text: string;
      own: boolean;
      file?: Attachment;
      reply?: Quote;
      seq?: number;
    }
  | { type: 'joined' | 'left'; id: string; name: string; members: Person[] }
  | { type: 'error'; text: string }
) & { at: number };

export type ChatMessage = Extract<ChatEvent, { type: 'message' }>;

export function quoteOf(message: ChatMessage): Quote {
  const { name, own, text, file, seq } = message;
  return { name, own, text, file, seq };
}

export interface Chat {
  id: string;
  kind: 'group' | 'private';
  ended: boolean;
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
  private?: boolean;
  members?: Person[];
  data?: string;
  seq?: number;
  reply?: number;
  file?: { kind: 'image' | 'file'; name: string; mime?: string; size: number; data?: string };
}

export const maxChats = 20;
export const fileMaxBytes = 5 * 1024 * 1024;
const fileNameMaxLength = 120;
const shownTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const typingShownFor = 3000;
const typingSentEvery = 2000;

const failures: Record<string, string> = {
  gone: 'Nothing to open: that group or person is gone.',
  self: "That's your own ID: share it so others can write to you.",
  busy: `They're already in ${maxChats} chats and can't take another.`,
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
    [...this._chats()].sort(
      (a, b) => (b.events.at(-1)?.at ?? b.at) - (a.events.at(-1)?.at ?? a.at),
    ),
  );
  readonly active = computed(
    () => this._chats().find((chat) => chat.id === this._active()) ?? null,
  );
  private readonly _picked = signal<{ room: string; files: File[]; previews: Attachment[] } | null>(
    null,
  );
  readonly picked = computed(() => {
    const picked = this._picked();
    return picked?.room === this._active() ? picked.previews : [];
  });

  private readonly http = inject(HttpClient);
  private readonly notice = inject(Notice);
  private readonly location = inject(DOCUMENT).location;
  private socket?: WebSocket;
  private ready = false;
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly typingSentAt = new Map<string, number>();
  private readonly sentFiles = new Map<string, File[]>();

  connect(name: string): void {
    const scheme = this.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${scheme}://${this.location.host}/api/ws?name=${encodeURIComponent(name)}`,
    );
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
    this._chats.update((chats) => [...chats, this.newChat(id, title)]);
    this.open(id);
    if (this.ready) {
      this.write({ type: 'join', room: id });
    }
  }

  remove(id: string): void {
    this.write({ type: 'leave', room: id });
    this.release(this._chats().filter((chat) => chat.id === id));
    this.sentFiles.delete(id);
    if (this._picked()?.room === id) {
      this.discardPicked();
    }
    this._chats.update((chats) => chats.filter((chat) => chat.id !== id));
    if (this._active() === id) {
      this._active.set(null);
    }
  }

  open(id: string | null): void {
    this._active.set(id);
    if (id) {
      this.update(id, (chat) => ({ ...chat, unread: 0 }));
    }
  }

  send(room: string, text: string, reply?: number): void {
    this.write({ type: 'message', room, text, reply });
    this.typingSentAt.delete(room);
  }

  pick(room: string, files: File[]): void {
    if (this._picked()?.room !== room) {
      this.discardPicked();
    }
    const picked = this._picked() ?? { room, files: [], previews: [] };
    this._picked.set({
      room,
      files: [...picked.files, ...files],
      previews: [
        ...picked.previews,
        ...files.map((file): Attachment => ({
          kind: shownTypes.includes(file.type) ? 'image' : 'file',
          name: file.name,
          size: file.size,
          url: URL.createObjectURL(file),
        })),
      ],
    });
  }

  discardPicked(): void {
    this._picked()?.previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    this._picked.set(null);
  }

  async sendPicked(items: Outgoing[], original: boolean): Promise<void> {
    const picked = this._picked();
    if (!picked) {
      return;
    }
    const files = items.map(({ file, caption }) => ({
      file: picked.files[picked.previews.indexOf(file)],
      caption,
    }));
    this.discardPicked();
    await this.sendFiles(picked.room, files, original);
  }

  async sendFiles(
    room: string,
    files: { file: File; caption: string }[],
    original = false,
  ): Promise<void> {
    for (const { file, caption } of files) {
      const ready = original ? file : await compressPhoto(file);
      if (ready.size > fileMaxBytes) {
        this.notice.show('Files up to 5 MB.');
      } else {
        this.sendFile(room, ready, caption.trim());
      }
    }
  }

  private sendFile(room: string, file: File, caption: string): void {
    const name = Array.from(file.name.trim() || 'file')
      .slice(-fileNameMaxLength)
      .join('')
      .trim();
    const reader = new FileReader();
    reader.onload = () => {
      this.sentFiles.set(room, [...(this.sentFiles.get(room) ?? []), new File([file], name)]);
      this.write({
        type: 'file',
        room,
        name,
        data: String(reader.result).split(',')[1],
        text: caption || undefined,
      });
    };
    reader.readAsDataURL(file);
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
    this.discardPicked();
    this.release(this._chats());
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
      this._chats.update((chats) =>
        chats.map((chat) =>
          chat.kind === 'private' && !chat.ended ? { ...chat, ended: true } : chat,
        ),
      );
      this._chats()
        .filter((chat) => chat.kind === 'group')
        .forEach((chat) => this.write({ type: 'join', room: chat.id }));
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
    if (frame.type === 'joined' && frame.private) {
      if (!this._chats().some((chat) => chat.id === room)) {
        this._chats.update((chats) => [...chats, this.newChat(room, '')]);
      }
      this.update(room, (chat) => ({
        ...chat,
        kind: 'private',
        ended: false,
        title: frame.title!,
        members: frame.members!,
      }));
      return;
    }
    if (frame.type === 'typing') {
      this.startTyping(room, { id: frame.id!, name: frame.name! });
      return;
    }
    const at = Date.now();
    const event = (
      frame.type === 'message'
        ? {
            type: 'message',
            id: frame.id,
            name: frame.name,
            text: frame.text ?? '',
            own: frame.id === this._me(),
            file: frame.file && this.attach(room, frame.file),
            reply: frame.reply ? this.quote(room, frame.reply) : undefined,
            seq: frame.seq,
            at,
          }
        : frame.type === 'error'
          ? { type: 'error', text: frame.text, at }
          : { type: frame.type, id: frame.id, name: frame.name, members: frame.members, at }
    ) as ChatEvent;
    if (event.type === 'message' || event.type === 'left') {
      this.stopTyping(room, event.id);
    }
    this.update(room, (chat) => ({
      ...chat,
      ended: chat.ended || (chat.kind === 'private' && event.type === 'left'),
      title: frame.title || chat.title,
      members: event.type === 'joined' || event.type === 'left' ? event.members : chat.members,
      events: [...chat.events, event],
      unread:
        event.type === 'message' && !event.own && this._active() !== room
          ? chat.unread + 1
          : chat.unread,
    }));
  }

  private attach(room: string, file: NonNullable<Frame['file']>): Attachment | undefined {
    const content = file.data
      ? Uint8Array.from(atob(file.data), (char) => char.charCodeAt(0))
      : this.takeSent(room, file.name, file.size);
    if (!content) {
      return undefined;
    }
    const type = file.kind === 'image' ? file.mime : 'application/octet-stream';
    return {
      kind: file.kind,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(new Blob([content], { type })),
    };
  }

  private quote(room: string, seq: number): Quote {
    const original = this._chats()
      .find((chat) => chat.id === room)
      ?.events.find((event) => event.type === 'message' && event.seq === seq);
    return original?.type === 'message'
      ? quoteOf(original)
      : { name: '', own: false, text: 'Earlier message' };
  }

  private takeSent(room: string, name: string, size: number): File | undefined {
    const sent = this.sentFiles.get(room) ?? [];
    const index = sent.findIndex((file) => file.name === name && file.size === size);
    return index < 0 ? undefined : sent.splice(index, 1)[0];
  }

  private release(chats: Chat[]): void {
    for (const event of chats.flatMap((chat) => chat.events)) {
      if (event.type === 'message' && event.file) {
        URL.revokeObjectURL(event.file.url);
      }
    }
  }

  private newChat(id: string, title: string): Chat {
    return {
      id,
      kind: 'group',
      ended: false,
      title,
      events: [],
      members: [],
      typing: [],
      unread: 0,
      at: Date.now(),
    };
  }

  private update(id: string, change: (chat: Chat) => Chat): void {
    this._chats.update((chats) => chats.map((chat) => (chat.id === id ? change(chat) : chat)));
  }

  private startTyping(room: string, person: Person): void {
    const key = `${room} ${person.id}`;
    clearTimeout(this.typingTimers.get(key));
    this.typingTimers.set(
      key,
      setTimeout(() => this.stopTyping(room, person.id), typingShownFor),
    );
    this.update(room, (chat) =>
      chat.typing.some(({ id }) => id === person.id)
        ? chat
        : { ...chat, typing: [...chat.typing, person] },
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
