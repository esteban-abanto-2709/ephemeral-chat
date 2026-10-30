import { DOCUMENT, OnDestroy, Service, inject, signal } from '@angular/core';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface ChatMessage {
  name: string;
  text: string;
}

@Service({ autoProvided: false })
export class RoomSocket implements OnDestroy {
  private readonly _status = signal<SocketStatus>('connecting');
  private readonly _messages = signal<ChatMessage[]>([]);
  readonly status = this._status.asReadonly();
  readonly messages = this._messages.asReadonly();

  private readonly location = inject(DOCUMENT).location;
  private socket?: WebSocket;

  connect(roomId: string, name: string): void {
    const scheme = this.location.protocol === 'https:' ? 'wss' : 'ws';
    const path = `/api/rooms/${encodeURIComponent(roomId)}/ws?name=${encodeURIComponent(name)}`;
    const socket = new WebSocket(`${scheme}://${this.location.host}${path}`);
    socket.onopen = () => this._status.set('open');
    socket.onclose = () => this._status.set('closed');
    socket.onmessage = (event: MessageEvent<string>) =>
      this._messages.update((messages) => [...messages, JSON.parse(event.data) as ChatMessage]);
    this.socket = socket;
  }

  send(text: string): void {
    this.socket?.send(JSON.stringify({ text }));
  }

  ngOnDestroy(): void {
    this.socket?.close();
  }
}
