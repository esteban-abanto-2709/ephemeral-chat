import { DOCUMENT, OnDestroy, Service, computed, inject, signal } from '@angular/core';

export type SocketStatus = 'connecting' | 'open' | 'closed';

const statusRoomGone = 4004;
const statusNameTaken = 4009;
const statusRoomFull = 4029;
const typingShownFor = 3000;
const typingSentEvery = 2000;

export type RoomEvent = (
  | { type: 'message'; name: string; text: string }
  | { type: 'joined' | 'left'; name: string; members: string[] }
  | { type: 'error'; text: string }
) & { at: number };

@Service({ autoProvided: false })
export class RoomSocket implements OnDestroy {
  private readonly _status = signal<SocketStatus>('connecting');
  private readonly _events = signal<RoomEvent[]>([]);
  private readonly _members = signal<string[]>([]);
  private readonly _closeCode = signal<number | null>(null);
  private readonly _typing = signal<string[]>([]);
  readonly status = this._status.asReadonly();
  readonly events = this._events.asReadonly();
  readonly members = this._members.asReadonly();
  readonly typing = this._typing.asReadonly();
  readonly nameTaken = computed(() => this._closeCode() === statusNameTaken);
  readonly roomGone = computed(() => this._closeCode() === statusRoomGone);
  readonly roomFull = computed(() => this._closeCode() === statusRoomFull);

  private readonly location = inject(DOCUMENT).location;
  private socket?: WebSocket;
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private typingSentAt = 0;

  connect(roomId: string, name: string): void {
    const scheme = this.location.protocol === 'https:' ? 'wss' : 'ws';
    const path = `/api/rooms/${encodeURIComponent(roomId)}/ws?name=${encodeURIComponent(name)}`;
    const socket = new WebSocket(`${scheme}://${this.location.host}${path}`);
    this._status.set('connecting');
    this._closeCode.set(null);
    this.clearTyping();
    socket.onopen = () => this._status.set('open');
    socket.onclose = (event) => {
      this._status.set('closed');
      this._closeCode.set(event.code);
    };
    socket.onmessage = (message: MessageEvent<string>) => {
      const data = JSON.parse(message.data);
      if (data.type === 'typing') {
        this.startTyping(data.name);
        return;
      }
      const event = { ...data, at: Date.now() } as RoomEvent;
      if (event.type === 'message' || event.type === 'left') {
        this.stopTyping(event.name);
      }
      if (event.type === 'joined' || event.type === 'left') {
        this._members.set(event.members);
      }
      this._events.update((events) => [...events, event]);
    };
    this.socket = socket;
  }

  send(text: string): void {
    this.socket?.send(JSON.stringify({ text }));
    this.typingSentAt = 0;
  }

  sendTyping(): void {
    const now = Date.now();
    if (this.socket?.readyState !== WebSocket.OPEN || now - this.typingSentAt < typingSentEvery) {
      return;
    }
    this.typingSentAt = now;
    this.socket.send(JSON.stringify({ type: 'typing' }));
  }

  ngOnDestroy(): void {
    this.clearTyping();
    this.socket?.close();
  }

  private startTyping(name: string): void {
    clearTimeout(this.typingTimers.get(name));
    this.typingTimers.set(name, setTimeout(() => this.stopTyping(name), typingShownFor));
    this._typing.update((names) => (names.includes(name) ? names : [...names, name]));
  }

  private stopTyping(name: string): void {
    clearTimeout(this.typingTimers.get(name));
    this.typingTimers.delete(name);
    this._typing.update((names) => names.filter((typist) => typist !== name));
  }

  private clearTyping(): void {
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();
    this._typing.set([]);
  }
}
