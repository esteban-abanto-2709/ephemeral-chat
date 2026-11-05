import { Component, DOCUMENT, inject, input, signal, viewChild } from '@angular/core';
import { LucideCheck, LucideInfo } from '@lucide/angular';
import { Glass } from '../glass/glass';
import { Notice } from '../notice';
import { NameDialog } from '../room/name-dialog/name-dialog';
import { RoomChat } from '../room/room-chat/room-chat';
import { VisibleViewport } from '../room/room-chat/visible-viewport';
import { ChatClient } from './chat-client';
import { ChatList } from './chat-list/chat-list';
import { ChatsWelcome } from './chats-welcome';

@Component({
  imports: [ChatList, ChatsWelcome, Glass, LucideCheck, LucideInfo, NameDialog, RoomChat, VisibleViewport],
  providers: [ChatClient],
  selector: 'app-chats-page',
  host: { '(document:keydown.escape)': 'client.open(null)' },
  templateUrl: './chats-page.html',
})
export class ChatsPage {
  readonly id = input<string>();

  protected readonly client = inject(ChatClient);
  protected readonly notice = inject(Notice);
  protected readonly creating = signal(false);
  private readonly list = viewChild.required(ChatList);
  private readonly origin = inject(DOCUMENT).location.origin;

  protected start(name: string): void {
    this.client.connect(name);
    const id = this.id();
    if (id) {
      this.client.join(id);
    }
  }

  protected create(title: string): void {
    this.creating.set(false);
    this.client.create(title);
  }

  protected joinWithCode(): void {
    this.list().focusSearch();
  }

  protected link(id: string): string {
    return `${this.origin}/room/${id}`;
  }
}
