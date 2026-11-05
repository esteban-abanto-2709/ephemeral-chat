import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideHourglass, LucideKeyRound, LucidePlus, LucideSearch, LucideUsersRound } from '@lucide/angular';
import { avatarHue } from '../../room/avatar-hue';
import { ThemeToggle } from '../../theme/theme-toggle/theme-toggle';
import { Chat } from '../chat-client';

const filters = ['All', 'Unread', 'Groups'] as const;
type Filter = (typeof filters)[number];

const codePattern = /(?:^|\/room\/)([A-Za-z0-9_-]{22})\/?$/;

export function codeIn(text: string): string | null {
  return codePattern.exec(text.trim())?.[1] ?? null;
}

@Component({
  imports: [DatePipe, LucideHourglass, LucideKeyRound, LucidePlus, LucideSearch, LucideUsersRound, ThemeToggle],
  selector: 'app-chat-list',
  templateUrl: './chat-list.html',
})
export class ChatList {
  readonly chats = input.required<Chat[]>();
  readonly active = input<string | null>(null);
  readonly selected = output<string>();
  readonly newGroup = output();
  readonly opened = output<string>();

  protected readonly avatarHue = avatarHue;
  protected readonly filters = filters;
  protected readonly filter = signal<Filter>('All');
  protected readonly query = signal('');
  protected readonly code = computed(() => codeIn(this.query()));
  protected readonly shown = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.chats().filter(
      (chat) =>
        (this.filter() !== 'Unread' || chat.unread > 0) && (!query || chat.title.toLowerCase().includes(query)),
    );
  });

  private readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');

  focusSearch(): void {
    this.search().nativeElement.focus();
  }

  protected preview(chat: Chat): string {
    const last = chat.events.filter((event) => event.type !== 'error').at(-1);
    if (!last) {
      return 'No messages yet';
    }
    if (last.type === 'message') {
      return `${last.own ? 'You' : last.name}: ${last.text}`;
    }
    return `${last.name} ${last.type}`;
  }

  protected lastAt(chat: Chat): number {
    return chat.events.at(-1)?.at ?? chat.at;
  }

  protected open(): void {
    const code = this.code();
    if (code) {
      this.opened.emit(code);
      this.query.set('');
    }
  }
}
