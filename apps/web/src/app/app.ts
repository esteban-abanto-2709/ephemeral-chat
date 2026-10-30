import { Component, computed, inject } from '@angular/core';
import { EchoSocket } from './echo-socket';

const statusLabels = {
  connecting: 'Connecting…',
  open: 'Connected',
  closed: 'Disconnected',
};

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly socket = inject(EchoSocket);
  protected readonly statusLabel = computed(() => statusLabels[this.socket.status()]);

  protected send(event: SubmitEvent, input: HTMLInputElement): void {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }
    this.socket.send(text);
    input.value = '';
  }
}
