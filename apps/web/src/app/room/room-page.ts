import { Component, DOCUMENT, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { LucideSearchX, LucideUsersRound } from '@lucide/angular';
import { RoomSocket } from './room-socket';
import { NameDialog } from './name-dialog/name-dialog';
import { RoomChat } from './room-chat/room-chat';
import { RoomNotice } from './room-notice/room-notice';

@Component({
  imports: [LucideSearchX, LucideUsersRound, NameDialog, RoomChat, RoomNotice],
  providers: [RoomSocket],
  selector: 'app-room-page',
  templateUrl: './room-page.html',
})
export class RoomPage {
  readonly id = input.required<string>();

  protected readonly room = httpResource(() => `/api/rooms/${encodeURIComponent(this.id())}`);

  protected readonly name = signal<string | null>(null);

  protected readonly socket = inject(RoomSocket);

  private readonly document = inject(DOCUMENT);
  protected readonly link = computed(() => `${this.document.location.origin}/room/${this.id()}`);

  protected join(name: string): void {
    this.name.set(name);
    this.socket.connect(this.id(), name);
  }

  protected reconnect(): void {
    const name = this.name();
    if (name) {
      this.room.reload();
      this.socket.connect(this.id(), name);
    }
  }
}
