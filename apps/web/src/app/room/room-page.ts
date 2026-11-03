import { Component, DOCUMENT, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { RoomSocket } from './room-socket';
import { NameDialog } from './name-dialog/name-dialog';

const messageMaxLength = 1000;

const statusLabels = {
  connecting: 'Connecting…',
  open: 'Connected',
  closed: 'Disconnected',
};

@Component({
  imports: [NameDialog, RouterLink],
  providers: [RoomSocket],
  selector: 'app-room-page',
  templateUrl: './room-page.html',
})
export class RoomPage {
  readonly id = input.required<string>();

  protected readonly room = httpResource(() => `/api/rooms/${encodeURIComponent(this.id())}`);

  protected readonly name = signal<string | null>(null);

  protected readonly socket = inject(RoomSocket);
  protected readonly statusLabel = computed(() => statusLabels[this.socket.status()]);
  protected readonly copied = signal(false);

  protected readonly messageMaxLength = messageMaxLength;
  protected readonly counterFrom = messageMaxLength - 100;
  protected readonly length = signal(0);

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
    this.length.set(0);
  }
}
