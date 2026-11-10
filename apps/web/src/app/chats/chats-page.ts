import { Component, DOCUMENT, computed, inject, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { LucideCheck, LucideInfo } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { Glass } from '../glass/glass';
import { Notice } from '../notice';
import { NameDialog } from '../room/name-dialog/name-dialog';
import { QrDialog } from '../room/qr-dialog/qr-dialog';
import { RoomChat } from '../room/room-chat/room-chat';
import { VisibleViewport } from '../room/room-chat/visible-viewport';
import { ChatClient } from './chat-client';
import { ChatList } from './chat-list/chat-list';
import { ChatsWelcome } from './chats-welcome';

@Component({
  imports: [
    ChatList,
    ChatsWelcome,
    Glass,
    LucideCheck,
    LucideInfo,
    NameDialog,
    QrDialog,
    RoomChat,
    TranslocoPipe,
    VisibleViewport,
  ],
  providers: [ChatClient],
  selector: 'app-chats-page',
  host: { '(document:keydown.escape)': '$event.defaultPrevented || client.open(null)' },
  templateUrl: './chats-page.html',
})
export class ChatsPage {
  readonly id = input<string>();

  protected readonly client = inject(ChatClient);
  protected readonly notice = inject(Notice);
  protected readonly creating = signal(false);
  protected readonly joined = signal<string | null>(null);
  protected readonly qr = signal<'private' | 'group' | null>(null);
  private readonly origin = inject(DOCUMENT).location.origin;
  protected readonly invite = computed(() => `${this.origin}/chat/${this.client.me()}`);
  private readonly location = inject(Location);

  protected start(name: string): void {
    this.client.connect(name);
    const id = this.id();
    if (id) {
      this.join(id);
      this.location.replaceState('/');
    }
  }

  protected join(code: string): void {
    this.client.join(code);
    this.joined.set(code);
  }

  protected select(id: string): void {
    this.joined.set(null);
    this.client.open(id);
  }

  protected create(title: string): void {
    this.creating.set(false);
    this.client.create(title);
  }

  protected link(id: string): string {
    return `${this.origin}/room/${id}`;
  }
}
