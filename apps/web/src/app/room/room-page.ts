import { Component, DOCUMENT, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { LucideSendHorizontal, LucideUsers } from '@lucide/angular';
import { Glass } from '../glass/glass';
import { RoomSocket } from './room-socket';
import { NameDialog } from './name-dialog/name-dialog';
import { RoomPanel } from './room-panel/room-panel';

const messageMaxLength = 1000;

const statusLabels = {
  connecting: 'Connecting…',
  open: 'Connected',
  closed: 'Disconnected',
};

@Component({
  imports: [Glass, LucideSendHorizontal, LucideUsers, NameDialog, RoomPanel, RouterLink],
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
  protected readonly panelOpen = signal(false);
  protected readonly company = computed(() => {
    const others = this.socket.members().filter((member) => member !== this.name());
    return others.length ? `${others.join(', ')} and you` : 'Only you';
  });

  protected readonly messageMaxLength = messageMaxLength;
  protected readonly counterFrom = messageMaxLength - 100;
  protected readonly length = signal(0);

  private readonly document = inject(DOCUMENT);
  protected readonly link = computed(() => `${this.document.location.origin}/room/${this.id()}`);

  protected join(name: string): void {
    this.name.set(name);
    this.socket.connect(this.id(), name);
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
