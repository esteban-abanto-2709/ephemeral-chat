import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  LucideCopy,
  LucideDownload,
  LucideFileText,
  LucideKeyRound,
  LucidePlay,
  LucideReply,
  LucideShieldCheck,
  LucideUsersRound,
} from '@lucide/angular';
import { Glass } from '../../glass/glass';
import { CopyLink } from '../copy-link/copy-link';
import { avatarHue } from '../avatar-hue';
import { ChatEvent } from '../../chats/chat-client';
import { duration, fileSize } from '../../chats/attachment';
import { QuoteCard } from '../quote/quote';

const stickyDistance = 80;

@Component({
  imports: [
    CopyLink,
    DatePipe,
    Glass,
    QuoteCard,
    LucideCopy,
    LucideDownload,
    LucideFileText,
    LucideKeyRound,
    LucidePlay,
    LucideReply,
    LucideShieldCheck,
    LucideUsersRound,
  ],
  selector: 'app-message-list',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './message-list.html',
})
export class MessageList {
  readonly events = input.required<ChatEvent[]>();
  readonly title = input('');
  readonly code = input('');

  protected readonly avatarHue = avatarHue;
  protected readonly duration = duration;
  protected readonly fileSize = fileSize;
  protected readonly items = computed(() =>
    this.events().map((event, index, events) => {
      const previous = events[index - 1];
      return {
        event,
        own: event.type === 'message' && event.own,
        first: !(
          event.type === 'message' &&
          previous?.type === 'message' &&
          previous.id === event.id
        ),
      };
    }),
  );

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private sticky = true;
  private readonly document = inject(DOCUMENT);

  constructor() {
    const resizes = new ResizeObserver(() => {
      if (this.sticky) {
        const list = this.list().nativeElement;
        list.scrollTop = list.scrollHeight;
      }
    });
    afterNextRender(() => resizes.observe(this.list().nativeElement));
    inject(DestroyRef).onDestroy(() => resizes.disconnect());

    afterRenderEffect(() => {
      const last = this.items().at(-1);
      if (this.sticky || last?.own) {
        const list = this.list().nativeElement;
        list.scrollTop = list.scrollHeight;
        this.sticky = true;
      }
    });
  }

  protected dismissKeyboard(): void {
    const focused = this.document.activeElement;
    if (focused instanceof HTMLInputElement) {
      focused.blur();
    }
  }

  protected follow(): void {
    const list = this.list().nativeElement;
    this.sticky = list.scrollHeight - list.scrollTop - list.clientHeight < stickyDistance;
  }
}
