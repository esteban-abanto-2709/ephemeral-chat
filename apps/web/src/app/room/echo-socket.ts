import { DOCUMENT, Service, inject, signal } from '@angular/core';

export type SocketStatus = 'connecting' | 'open' | 'closed';

@Service()
export class EchoSocket {
  readonly status = signal<SocketStatus>('connecting');
  readonly messages = signal<string[]>([]);

  private readonly socket = this.connect();

  send(text: string): void {
    this.socket.send(text);
  }

  private connect(): WebSocket {
    const { protocol, host } = inject(DOCUMENT).location;
    const socket = new WebSocket(`${protocol === 'https:' ? 'wss' : 'ws'}://${host}/api/ws`);
    socket.onopen = () => this.status.set('open');
    socket.onclose = () => this.status.set('closed');
    socket.onmessage = (event: MessageEvent<string>) =>
      this.messages.update((messages) => [...messages, event.data]);
    return socket;
  }
}
