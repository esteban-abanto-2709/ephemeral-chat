import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  LucideCheck,
  LucideCopy,
  LucideRefreshCw,
  LucideSendHorizontal,
  LucideUsers,
  LucideWifiOff,
} from '@lucide/angular';
import { Glass } from '../../glass/glass';
import { CopyLink, CopyNotice } from '../copy-link/copy-link';
import { MessageList } from '../message-list/message-list';
import { RoomPanel } from '../room-panel/room-panel';
import { Person, RoomEvent, SocketStatus } from '../room-socket';
import { VisibleViewport } from './visible-viewport';

const messageMaxLength = 1000;

const statusLabels = {
  connecting: 'Connecting…',
  open: 'Connected',
  closed: 'Disconnected',
};

@Component({
  imports: [
    CopyLink,
    Glass,
    LucideCheck,
    LucideCopy,
    LucideRefreshCw,
    LucideSendHorizontal,
    LucideUsers,
    LucideWifiOff,
    MessageList,
    RoomPanel,
    VisibleViewport,
  ],
  selector: 'app-room-chat',
  templateUrl: './room-chat.html',
})
export class RoomChat {
  readonly status = input.required<SocketStatus>();
  readonly events = input.required<RoomEvent[]>();
  readonly members = input.required<Person[]>();
  readonly me = input.required<string>();
  readonly link = input.required<string>();
  readonly typing = input<string[]>([]);
  readonly sent = output<string>();
  readonly reconnect = output();
  readonly typed = output();

  protected readonly copied = inject(CopyNotice).visible;
  protected readonly statusLabel = computed(() => {
    const [first, second, ...rest] = this.typing();
    if (this.status() !== 'open' || !first) {
      return statusLabels[this.status()];
    }
    if (!second) {
      return `${first} is typing…`;
    }
    return rest.length ? `${first} and ${rest.length + 1} more are typing…` : `${first} and ${second} are typing…`;
  });
  protected readonly panelOpen = signal(false);

  protected readonly messageMaxLength = messageMaxLength;
  protected readonly counterFrom = messageMaxLength - 100;
  protected readonly length = signal(0);

  protected write(input: HTMLInputElement): void {
    this.length.set(input.value.length);
    if (input.value.trim()) {
      this.typed.emit();
    }
  }

  protected send(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }
    this.sent.emit(text);
    input.value = '';
    this.length.set(0);
  }
}
