import { Component, computed, input, output, signal } from '@angular/core';
import {
  LucideArrowLeft,
  LucideCopy,
  LucideLock,
  LucideLogOut,
  LucideRefreshCw,
  LucideShieldCheck,
  LucideTrash2,
  LucideSendHorizontal,
  LucideUsersRound,
  LucideWifiOff,
} from '@lucide/angular';
import { ChatEvent, Person, SocketStatus } from '../../chats/chat-client';
import { Glass } from '../../glass/glass';
import { avatarHue } from '../avatar-hue';
import { CopyLink } from '../copy-link/copy-link';
import { MessageList } from '../message-list/message-list';

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
    LucideArrowLeft,
    LucideCopy,
    LucideLock,
    LucideLogOut,
    LucideRefreshCw,
    LucideShieldCheck,
    LucideTrash2,
    LucideSendHorizontal,
    LucideUsersRound,
    LucideWifiOff,
    MessageList,
  ],
  selector: 'app-room-chat',
  host: { class: 'relative flex min-w-0 flex-1 flex-col' },
  templateUrl: './room-chat.html',
})
export class RoomChat {
  readonly status = input.required<SocketStatus>();
  readonly title = input.required<string>();
  readonly kind = input<'group' | 'private'>('group');
  readonly ended = input(false);
  readonly events = input.required<ChatEvent[]>();
  readonly members = input.required<Person[]>();
  readonly me = input.required<string>();
  readonly code = input.required<string>();
  readonly link = input.required<string>();
  readonly typing = input<Person[]>([]);
  readonly sent = output<string>();
  readonly reconnect = output();
  readonly typed = output();
  readonly closed = output();
  readonly deleted = output();

  protected readonly avatarHue = avatarHue;
  protected readonly subtitle = computed(() => {
    const [first, second, ...rest] = this.typing().map((person) => person.name);
    if (this.status() !== 'open') {
      return statusLabels[this.status()];
    }
    if (!first && this.kind() === 'private') {
      return this.ended() ? 'Left the chat' : 'Online';
    }
    if (!first) {
      const others = this.members().filter((member) => member.id !== this.me());
      return [...others.map((member) => member.name), 'you'].join(', ');
    }
    if (!second) {
      return `${first} is typing…`;
    }
    return rest.length ? `${first} and ${rest.length + 1} more are typing…` : `${first} and ${second} are typing…`;
  });

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
