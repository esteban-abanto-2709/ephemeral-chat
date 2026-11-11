import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  LucideCopy,
  LucideKeyRound,
  LucidePencil,
  LucidePlus,
  LucideQrCode,
  LucideUsersRound,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { I18n } from '../../i18n/i18n';
import { LangToggle } from '../../i18n/lang-toggle/lang-toggle';
import { Logo } from '../../logo/logo';
import { Notice } from '../../notice';
import { CopyLink } from '../../room/copy-link/copy-link';
import { avatarHue, initials } from '../../room/avatar-hue';
import { ThemeToggle } from '../../theme/theme-toggle/theme-toggle';
import { describe } from '../attachment';
import { Chat } from '../chat-client';

const filters = ['all', 'unread', 'groups', 'private'] as const;
type Filter = (typeof filters)[number];

const codePattern = /(?:^|\/(?:room|chat)\/)([A-Za-z0-9_-]{22})\/?$/;

export function codeIn(text: string): string | null {
  return codePattern.exec(text.trim())?.[1] ?? null;
}

@Component({
  imports: [
    CopyLink,
    DatePipe,
    LangToggle,
    Logo,
    LucideCopy,
    LucideKeyRound,
    LucidePencil,
    LucidePlus,
    LucideQrCode,
    LucideUsersRound,
    ThemeToggle,
    TranslocoPipe,
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
  readonly rename = output();
  readonly opened = output<string>();

  protected readonly avatarHue = avatarHue;
  protected readonly initials = initials;
  protected readonly filters = filters;
  protected readonly filter = signal<Filter>('all');
  protected readonly shown = computed(() =>
    this.chats().filter(
      (chat) =>
        this.filter() === 'all' ||
        (this.filter() === 'unread' && chat.unread > 0) ||
        (this.filter() === 'groups' && chat.kind === 'group') ||
        (this.filter() === 'private' && chat.kind === 'private'),
    ),
  );

  private readonly notice = inject(Notice);
  private readonly i18n = inject(I18n);

  protected preview(chat: Chat): string {
    const last = chat.events.filter((event) => event.type !== 'error').at(-1);
    if (!last) {
      return this.i18n.t('chatList.noMessages');
    }
    if (last.type === 'message') {
      const text = last.file ? describe(last.file, this.i18n) : last.text;
      if (last.own) {
        return this.i18n.t('chatList.own', { text });
      }
      return chat.kind === 'private'
        ? text
        : this.i18n.t('chatList.from', { name: last.name, text });
    }
    return this.i18n.t(`events.${last.type}`, last);
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
      this.notice.show(this.i18n.t('chatList.notCode'));
    }
  }
}
