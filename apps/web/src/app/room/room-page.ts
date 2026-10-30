import { Component, DOCUMENT, computed, inject, input, signal } from '@angular/core';
import { RoomSocket } from './room-socket';
import { NameDialog } from './name-dialog/name-dialog';

const statusLabels = {
  connecting: 'Connecting…',
  open: 'Connected',
  closed: 'Disconnected',
};

@Component({
  imports: [NameDialog],
  providers: [RoomSocket],
  selector: 'app-room-page',
  templateUrl: './room-page.html',
})
export class RoomPage {
  readonly id = input.required<string>();

  protected readonly name = signal<string | null>(null);

  protected readonly socket = inject(RoomSocket);
  protected readonly statusLabel = computed(() => statusLabels[this.socket.status()]);
  protected readonly copied = signal(false);

  private readonly document = inject(DOCUMENT);
  protected readonly link = computed(() => `${this.document.location.origin}/room/${this.id()}`);

  protected join(name: string): void {
    this.name.set(name);
    this.socket.connect(this.id(), name);
  }

  protected copyLink(): void {
    this.document.defaultView?.navigator.clipboard
      .writeText(this.link())
      .then(() => this.copied.set(true));
  }

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
