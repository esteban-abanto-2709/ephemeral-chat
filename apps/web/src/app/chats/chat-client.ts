import { DOCUMENT, OnDestroy, Service, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { I18n } from '../i18n/i18n';
import { Notice } from '../notice';
import { Attachment, Outgoing, Quote } from './attachment';
import { compressPhoto } from './compress-photo';
import { decodeFrame, encodeFrame } from './frame';

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
  | { type: 'renamed'; id: string; name: string; from: string }
  | { type: 'error'; code: string }
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
  read: number;
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
  seq?: number;
  reply?: number;
  seconds?: number;
  file?: {
    kind: 'image' | 'file' | 'voice';
    name: string;
    mime?: string;
    size: number;
    seconds?: number;
    bytes?: Uint8Array<ArrayBuffer>;
  };
}

export const maxChats = 20;
export const fileMaxBytes = 3 * 1024 * 1024;
export const voiceMaxBytes = 1024 * 1024;
const fileNameMaxLength = 120;
const shownTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const typingShownFor = 3000;
const typingSentEvery = 2000;

const failures = ['gone', 'self', 'busy', 'full', 'limit'];

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
  private readonly i18n = inject(I18n);
  private readonly document = inject(DOCUMENT);
  private readonly location = this.document.location;
  private socket?: WebSocket;
  private ready = false;
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly typingSentAt = new Map<string, number>();
  private readonly sentFiles = new Map<string, File[]>();
  private readonly readSent = new Map<string, number>();
  private readonly onVisibility = () => {
    const room = this._active();
    if (room) {
      this.markRead(room);
    }
  };

  constructor() {
    this.document.addEventListener('visibilitychange', this.onVisibility);
  }

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
    socket.binaryType = 'arraybuffer';
    socket.onmessage = (message: MessageEvent<string | ArrayBuffer>) => {
      if (typeof message.data === 'string') {
        this.receive(JSON.parse(message.data));
        return;
      }
      const { header, data } = decodeFrame(message.data);
      const frame = header as Frame;
      if (frame.file) {
        frame.file.bytes = data;
      }
      this.receive(frame);
    };
    this.socket = socket;
  }

  reconnect(): void {
    const name = this._name();
    if (name) {
      this.connect(name);
    }
  }

  rename(name: string): void {
    this.write({ type: 'rename', name });
  }

  create(title: string): void {
    this.http.post<{ id: string }>('/api/rooms', { name: title }).subscribe({
      next: ({ id }) => this.join(id, title),
      error: () => this.notice.show(this.i18n.t('errors.groupFailed')),
    });
  }

  join(id: string, title = ''): void {
    if (this._chats().some((chat) => chat.id === id)) {
      this.open(id);
      return;
    }
    if (this._chats().length >= maxChats) {
      this.fail('limit');
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
    this.readSent.delete(id);
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
      this.markRead(id);
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
        this.notice.show(this.i18n.t('errors.fileTooBig'));
      } else {
        this.sendFile(room, ready, { text: caption.trim() || undefined });
      }
    }
  }

  sendVoice(room: string, voice: Blob, seconds: number, reply?: number): void {
    if (voice.size > voiceMaxBytes) {
      this.notice.show(this.i18n.t('errors.voiceTooBig'));
      return;
    }
    const extension = voice.type.includes('mp4')
      ? 'm4a'
      : voice.type.includes('ogg')
        ? 'ogg'
        : 'webm';
    this.sendFile(room, new File([voice], `voice.${extension}`, { type: voice.type }), {
      seconds,
      reply,
    });
  }

  private sendFile(room: string, file: File, extra: Partial<Frame>): void {
    const name = Array.from(file.name.trim() || 'file')
      .slice(-fileNameMaxLength)
      .join('')
      .trim();
    this.sentFiles.set(room, [...(this.sentFiles.get(room) ?? []), new File([file], name)]);
    this.sendBinary(encodeFrame({ type: 'file', room, name, ...extra }, file));
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
    this.document.removeEventListener('visibilitychange', this.onVisibility);
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

  private markRead(room: string): void {
    const chat = this._chats().find((candidate) => candidate.id === room);
    if (
      !this.ready ||
      chat?.kind !== 'private' ||
      chat.ended ||
      this._active() !== room ||
      this.document.visibilityState !== 'visible'
    ) {
      return;
    }
    const seq = chat.events.reduce(
      (highest, event) =>
        event.type === 'message' && !event.own ? Math.max(highest, event.seq ?? 0) : highest,
      0,
    );
    if (seq > (this.readSent.get(room) ?? 0)) {
      this.readSent.set(room, seq);
      this.write({ type: 'read', room, seq });
    }
  }

  private sendBinary(blob: Blob): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(blob);
    }
  }

  private receive(frame: Frame): void {
    if (frame.type === 'ready') {
      this._me.set(frame.id!);
      this.ready = true;
      this.readSent.clear();
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
    if (frame.type === 'renamed' && !frame.room) {
      this._name.set(frame.name!);
      return;
    }
    if (frame.type === 'error' && !frame.room) {
      this.fail(frame.code!);
      return;
    }
    const room = frame.room!;
    if (frame.type === 'renamed') {
      this.update(room, (chat) => {
        const from = chat.members.find((member) => member.id === frame.id)?.name ?? frame.name!;
        return {
          ...chat,
          title: chat.kind === 'private' && frame.id !== this._me() ? frame.name! : chat.title,
          members: chat.members.map((member) =>
            member.id === frame.id ? { ...member, name: frame.name! } : member,
          ),
          events: [
            ...chat.events,
            { type: 'renamed', id: frame.id!, name: frame.name!, from, at: Date.now() },
          ],
        };
      });
      return;
    }
    if (frame.type === 'error' && !frame.code?.startsWith('slow-')) {
      this.fail(failures.includes(frame.code ?? '') ? frame.code! : 'gone');
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
      const reopened = this._chats().some((chat) => chat.id === room && chat.ended);
      if (reopened) {
        this.readSent.delete(room);
      }
      this.update(room, (chat) => ({
        ...(reopened ? this.withoutReceipts(chat) : chat),
        kind: 'private',
        ended: false,
        title: frame.title!,
        members: frame.members!,
      }));
      return;
    }
    if (frame.type === 'read') {
      this.update(room, (chat) => ({ ...chat, read: Math.max(chat.read, frame.seq!) }));
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
          ? { type: 'error', code: frame.code, at }
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
    if (event.type === 'message') {
      this.markRead(room);
    }
  }

  private withoutReceipts(chat: Chat): Chat {
    return {
      ...chat,
      read: 0,
      events: chat.events.map((event) =>
        event.type === 'message'
          ? {
              ...event,
              seq: undefined,
              reply: event.reply && { ...event.reply, seq: undefined },
            }
          : event,
      ),
    };
  }

  private attach(room: string, file: NonNullable<Frame['file']>): Attachment | undefined {
    const content = file.bytes ?? this.takeSent(room, file.name, file.size);
    if (!content) {
      return undefined;
    }
    const type = file.mime ?? 'application/octet-stream';
    return {
      kind: file.kind,
      name: file.name,
      size: file.size,
      seconds: file.seconds,
      url: URL.createObjectURL(new Blob([content], { type })),
    };
  }

  private quote(room: string, seq: number): Quote {
    const original = this._chats()
      .find((chat) => chat.id === room)
      ?.events.find((event) => event.type === 'message' && event.seq === seq);
    return original?.type === 'message' ? quoteOf(original) : { name: '', own: false, text: '' };
  }

  private takeSent(room: string, name: string, size: number): File | undefined {
    const sent = this.sentFiles.get(room) ?? [];
    const index = sent.findIndex((file) => file.name === name && file.size === size);
    return index < 0 ? undefined : sent.splice(index, 1)[0];
  }

  private fail(code: string): void {
    this.notice.show(this.i18n.t(`errors.${code}`, { max: maxChats }));
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
      read: 0,
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
