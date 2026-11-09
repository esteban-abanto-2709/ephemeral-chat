import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  LucideCopy,
  LucideHourglass,
  LucideKeyRound,
  LucidePlus,
  LucideQrCode,
  LucideUsersRound,
} from '@lucide/angular';
import { Notice } from '../../notice';
import { CopyLink } from '../../room/copy-link/copy-link';
import { avatarHue } from '../../room/avatar-hue';
import { ThemeToggle } from '../../theme/theme-toggle/theme-toggle';
import { describe } from '../attachment';
import { Chat } from '../chat-client';

const filters = ['All', 'Unread', 'Groups', 'Private'] as const;
type Filter = (typeof filters)[number];

const codePattern = /(?:^|\/(?:room|chat)\/)([A-Za-z0-9_-]{22})\/?$/;

export function codeIn(text: string): string | null {
  return codePattern.exec(text.trim())?.[1] ?? null;
}

@Component({
  imports: [
    CopyLink,
    DatePipe,
    LucideCopy,
    LucideHourglass,
    LucideKeyRound,
    LucidePlus,
    LucideQrCode,
    LucideUsersRound,
    ThemeToggle,
  ],
  selector: 'app-chat-list',
  templateUrl: './chat-list.html',
})
export class ChatList {
  readonly chats = input.required<Chat[]>();
  readonly active = input<string | null>(null);
  readonly me = input('');
  readonly name = input<string | null>(null);
  readonly selected = output<string>();
  readonly newGroup = output();
  readonly showQr = output();
  readonly opened = output<string>();

  protected readonly avatarHue = avatarHue;
  protected readonly filters = filters;
  protected readonly filter = signal<Filter>('All');
  protected readonly shown = computed(() =>
    this.chats().filter(
      (chat) =>
        this.filter() === 'All' ||
        (this.filter() === 'Unread' && chat.unread > 0) ||
        (this.filter() === 'Groups' && chat.kind === 'group') ||
        (this.filter() === 'Private' && chat.kind === 'private'),
    ),
  );

  private readonly notice = inject(Notice);

  protected preview(chat: Chat): string {
    const last = chat.events.filter((event) => event.type !== 'error').at(-1);
    if (!last) {
      return 'No messages yet';
    }
    if (last.type === 'message') {
      const text = last.file ? describe(last.file) : last.text;
      if (last.own) {
        return `You: ${text}`;
      }
      return chat.kind === 'private' ? text : `${last.name}: ${text}`;
    }
    return `${last.name} ${last.type}`;
  }

  protected lastAt(chat: Chat): number {
    return chat.events.at(-1)?.at ?? chat.at;
  }

  protected open(field: HTMLInputElement): void {
    const code = codeIn(field.value);
    if (code) {
      this.opened.emit(code);
      field.value = '';
    } else if (field.value.trim()) {
      this.notice.show("That's not a code, link or ID.");
    }
  }
}
