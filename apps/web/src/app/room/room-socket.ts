import { DOCUMENT, OnDestroy, Service, computed, inject, signal } from '@angular/core';

export type SocketStatus = 'connecting' | 'open' | 'closed';

const statusRoomGone = 4004;
const statusNameTaken = 4009;
const statusRoomFull = 4029;

export type RoomEvent =
  | { type: 'message'; name: string; text: string }
  | { type: 'joined' | 'left'; name: string; members: string[] }
  | { type: 'error'; text: string };

@Service({ autoProvided: false })
export class RoomSocket implements OnDestroy {
  private readonly _status = signal<SocketStatus>('connecting');
  private readonly _events = signal<RoomEvent[]>([]);
  private readonly _members = signal<string[]>([]);
  private readonly _closeCode = signal<number | null>(null);
  readonly status = this._status.asReadonly();
  readonly events = this._events.asReadonly();
  readonly members = this._members.asReadonly();
  readonly nameTaken = computed(() => this._closeCode() === statusNameTaken);
  readonly roomGone = computed(() => this._closeCode() === statusRoomGone);
  readonly roomFull = computed(() => this._closeCode() === statusRoomFull);

  private readonly location = inject(DOCUMENT).location;
  private socket?: WebSocket;

  connect(roomId: string, name: string): void {
    const scheme = this.location.protocol === 'https:' ? 'wss' : 'ws';
    const path = `/api/rooms/${encodeURIComponent(roomId)}/ws?name=${encodeURIComponent(name)}`;
    const socket = new WebSocket(`${scheme}://${this.location.host}${path}`);
    this._status.set('connecting');
    this._closeCode.set(null);
    socket.onopen = () => this._status.set('open');
    socket.onclose = (event) => {
      this._status.set('closed');
      this._closeCode.set(event.code);
    };
    socket.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as RoomEvent;
      if (event.type === 'joined' || event.type === 'left') {
        this._members.set(event.members);
      }
      this._events.update((events) => [...events, event]);
    };
    this.socket = socket;
  }

  send(text: string): void {
    this.socket?.send(JSON.stringify({ text }));
  }

  ngOnDestroy(): void {
    this.socket?.close();
  }
}
