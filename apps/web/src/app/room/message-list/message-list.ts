import { Component, ElementRef, afterRenderEffect, computed, input, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { avatarColor } from '../avatar-color';
import { RoomEvent } from '../room-socket';

const stickyDistance = 80;

@Component({
  imports: [DatePipe],
  selector: 'app-message-list',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './message-list.html',
})
export class MessageList {
  readonly events = input.required<RoomEvent[]>();
  readonly me = input.required<string>();

  protected readonly avatarColor = avatarColor;
  protected readonly items = computed(() =>
    this.events().map((event, index, events) => {
      const previous = events[index - 1];
      const name = event.type === 'error' ? '' : event.name;
      return {
        event,
        own: event.type === 'message' && name === this.me(),
        first: !(
          event.type === 'message' &&
          previous?.type === 'message' &&
          previous.name === name
        ),
      };
    }),
  );

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private sticky = true;

  constructor() {
    afterRenderEffect(() => {
      const last = this.items().at(-1);
      if (this.sticky || last?.own) {
        const list = this.list().nativeElement;
        list.scrollTop = list.scrollHeight;
        this.sticky = true;
      }
    });
  }

  protected follow(): void {
    const list = this.list().nativeElement;
    this.sticky = list.scrollHeight - list.scrollTop - list.clientHeight < stickyDistance;
  }
}
