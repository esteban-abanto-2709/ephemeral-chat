import { DOCUMENT, OnDestroy, Service, inject, signal } from '@angular/core';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export type RoomEvent =
  | { type: 'message'; name: string; text: string }
  | { type: 'joined' | 'left'; name: string; members: string[] };

@Service({ autoProvided: false })
export class RoomSocket implements OnDestroy {
  private readonly _status = signal<SocketStatus>('connecting');
  private readonly _events = signal<RoomEvent[]>([]);
  private readonly _members = signal<string[]>([]);
  readonly status = this._status.asReadonly();
  readonly events = this._events.asReadonly();
  readonly members = this._members.asReadonly();

  private readonly location = inject(DOCUMENT).location;
  private socket?: WebSocket;

  connect(roomId: string, name: string): void {
    const scheme = this.location.protocol === 'https:' ? 'wss' : 'ws';
    const path = `/api/rooms/${encodeURIComponent(roomId)}/ws?name=${encodeURIComponent(name)}`;
    const socket = new WebSocket(`${scheme}://${this.location.host}${path}`);
    socket.onopen = () => this._status.set('open');
    socket.onclose = () => this._status.set('closed');
    socket.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as RoomEvent;
      if (event.type !== 'message') {
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
