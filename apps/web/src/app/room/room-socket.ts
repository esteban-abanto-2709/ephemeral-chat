import { DOCUMENT, OnDestroy, Service, computed, inject, signal } from '@angular/core';

export type SocketStatus = 'connecting' | 'open' | 'closed';

const typingShownFor = 3000;
const typingSentEvery = 2000;

export interface Person {
  id: string;
  name: string;
}

export type RoomEvent = (
  | { type: 'message'; id: string; name: string; text: string; own: boolean }
  | { type: 'joined' | 'left'; id: string; name: string; members: Person[] }
  | { type: 'error'; text: string }
) & { at: number };

@Service({ autoProvided: false })
export class RoomSocket implements OnDestroy {
  private readonly _status = signal<SocketStatus>('connecting');
  private readonly _events = signal<RoomEvent[]>([]);
  private readonly _members = signal<Person[]>([]);
  private readonly _me = signal('');
  private readonly _failure = signal<string | null>(null);
  private readonly _typing = signal<Person[]>([]);
  readonly status = this._status.asReadonly();
  readonly events = this._events.asReadonly();
  readonly members = this._members.asReadonly();
  readonly me = this._me.asReadonly();
  readonly typing = computed(() => this._typing().map((person) => person.name));
  readonly roomGone = computed(() => this._failure() === 'gone');
  readonly roomFull = computed(() => this._failure() === 'full');

  private readonly location = inject(DOCUMENT).location;
  private socket?: WebSocket;
  private roomId = '';
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private typingSentAt = 0;

  connect(roomId: string, name: string): void {
    const scheme = this.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${scheme}://${this.location.host}/api/ws?name=${encodeURIComponent(name)}`);
    this.roomId = roomId;
    this._status.set('connecting');
    this._failure.set(null);
    this.clearTyping();
    socket.onopen = () => {
      this._status.set('open');
      socket.send(JSON.stringify({ type: 'join', room: roomId }));
    };
    socket.onclose = () => this._status.set('closed');
    socket.onmessage = (message: MessageEvent<string>) => this.receive(JSON.parse(message.data));
    this.socket = socket;
  }

  send(text: string): void {
    this.socket?.send(JSON.stringify({ type: 'message', room: this.roomId, text }));
    this.typingSentAt = 0;
  }

  sendTyping(): void {
    const now = Date.now();
    if (this.socket?.readyState !== WebSocket.OPEN || now - this.typingSentAt < typingSentEvery) {
      return;
    }
    this.typingSentAt = now;
    this.socket.send(JSON.stringify({ type: 'typing', room: this.roomId }));
  }

  ngOnDestroy(): void {
    this.clearTyping();
    this.socket?.close();
  }

  private receive(data: { type: string; code?: string } & Partial<Person>): void {
    if (data.type === 'ready') {
      this._me.set(data.id!);
      return;
    }
    if (data.type === 'typing') {
      this.startTyping({ id: data.id!, name: data.name! });
      return;
    }
    if (data.type === 'error' && data.code) {
      this._failure.set(data.code);
      return;
    }
    const at = Date.now();
    const event = (
      data.type === 'message' ? { ...data, own: data.id === this._me(), at } : { ...data, at }
    ) as RoomEvent;
    if (event.type === 'message' || event.type === 'left') {
      this.stopTyping(event.id);
    }
    if (event.type === 'joined' || event.type === 'left') {
      this._members.set(event.members);
    }
    this._events.update((events) => [...events, event]);
  }

  private startTyping(person: Person): void {
    clearTimeout(this.typingTimers.get(person.id));
    this.typingTimers.set(person.id, setTimeout(() => this.stopTyping(person.id), typingShownFor));
    this._typing.update((people) => (people.some(({ id }) => id === person.id) ? people : [...people, person]));
  }

  private stopTyping(id: string): void {
    clearTimeout(this.typingTimers.get(id));
    this.typingTimers.delete(id);
    this._typing.update((people) => people.filter((person) => person.id !== id));
  }

  private clearTyping(): void {
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();
    this._typing.set([]);
  }
}
