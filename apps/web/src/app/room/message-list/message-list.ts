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
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  LucideCheck,
  LucideCheckCheck,
  LucideCopy,
  LucideDownload,
  LucideFileText,
  LucideKeyRound,
  LucideReply,
  LucideShieldCheck,
  LucideUsersRound,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { Glass } from '../../glass/glass';
import { CopyLink } from '../copy-link/copy-link';
import { avatarHue } from '../avatar-hue';
import { ChatEvent, ChatMessage } from '../../chats/chat-client';
import { duration, fileSize } from '../../chats/attachment';
import { LinkedText } from '../linked-text/linked-text';
import { QuoteCard } from '../quote/quote';
import { VoiceNote } from '../voice-note/voice-note';

const stickyDistance = 80;

@Component({
  imports: [
    CopyLink,
    DatePipe,
    Glass,
    LinkedText,
    NgTemplateOutlet,
    QuoteCard,
    VoiceNote,
    LucideCheck,
    LucideCheckCheck,
    LucideCopy,
    LucideDownload,
    LucideFileText,
    LucideKeyRound,
    LucideReply,
    LucideShieldCheck,
    LucideUsersRound,
    TranslocoPipe,
  ],
  selector: 'app-message-list',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './message-list.html',
})
export class MessageList {
  readonly events = input.required<ChatEvent[]>();
  readonly title = input('');
  readonly code = input('');
  readonly read = input<number | null>(null);
  readonly viewed = output<ChatMessage>();
  readonly replied = output<ChatMessage>();

  protected readonly selected = signal<number | null>(null);

  protected readonly avatarHue = avatarHue;
  protected readonly duration = duration;
  protected readonly fileSize = fileSize;
  protected readonly items = computed(() =>
    this.events().map((event, index, events) => {
      const previous = events[index - 1];
      const read = this.read();
      const own = event.type === 'message' && event.own;
      const check: 'sent' | 'read' | null =
        own && event.seq && read !== null ? (event.seq <= read ? 'read' : 'sent') : null;
      return {
        event,
        own,
        check,
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

  protected reply(click: Event, message: ChatMessage): void {
    click.stopPropagation();
    this.selected.set(null);
    this.replied.emit(message);
  }

  protected jump(seq: number): void {
    this.list()
      .nativeElement.querySelector(`[data-seq="${seq}"]`)
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
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
