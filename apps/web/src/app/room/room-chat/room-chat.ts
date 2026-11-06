import {
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideArrowLeft,
  LucideCopy,
  LucideLock,
  LucideLogOut,
  LucideMic,
  LucidePaperclip,
  LucideRefreshCw,
  LucideShieldCheck,
  LucideTrash2,
  LucideSendHorizontal,
  LucideUsersRound,
  LucideWifiOff,
  LucideX,
} from '@lucide/angular';
import { Quote, duration } from '../../chats/attachment';
import { ChatEvent, Person, SocketStatus } from '../../chats/chat-client';
import { Glass } from '../../glass/glass';
import { avatarHue } from '../avatar-hue';
import { CopyLink } from '../copy-link/copy-link';
import { MessageList } from '../message-list/message-list';
import { QuoteCard } from '../quote/quote';

const messageMaxLength = 1000;
const voiceMaxSeconds = 60;

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
    LucideMic,
    LucidePaperclip,
    LucideRefreshCw,
    LucideShieldCheck,
    LucideTrash2,
    LucideSendHorizontal,
    LucideUsersRound,
    LucideWifiOff,
    LucideX,
    MessageList,
    QuoteCard,
  ],
  selector: 'app-room-chat',
  host: {
    class: 'relative flex min-w-0 flex-1 flex-col',
    '(dragover)': '$event.preventDefault()',
    '(drop)': 'drop($event)',
  },
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
  readonly focus = input(false);
  readonly voice = input(false);
  readonly recording = input<number | null>(null);
  readonly replying = input<Quote | null>(null);
  readonly sent = output<string>();
  readonly attached = output<File[]>();
  readonly reconnect = output();
  readonly typed = output();
  readonly closed = output();
  readonly deleted = output();

  protected readonly avatarHue = avatarHue;
  protected readonly duration = duration;
  protected readonly voiceMaxSeconds = voiceMaxSeconds;
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
    return rest.length
      ? `${first} and ${rest.length + 1} more are typing…`
      : `${first} and ${second} are typing…`;
  });

  private readonly composer = viewChild<ElementRef<HTMLInputElement>>('input');
  private readonly finePointer =
    !!inject(DOCUMENT).defaultView?.matchMedia?.('(pointer: fine)').matches;

  constructor() {
    afterRenderEffect(() => {
      this.code();
      if (this.finePointer || this.focus()) {
        this.composer()?.nativeElement.focus();
      }
    });
  }

  protected readonly messageMaxLength = messageMaxLength;
  protected readonly counterFrom = messageMaxLength - 100;
  protected readonly length = signal(0);

  protected write(input: HTMLInputElement): void {
    this.length.set(input.value.length);
    if (input.value.trim()) {
      this.typed.emit();
    }
  }

  protected pick(picker: HTMLInputElement): void {
    this.attach(picker.files);
    picker.value = '';
  }

  protected paste(event: ClipboardEvent): void {
    if (event.clipboardData?.files.length) {
      event.preventDefault();
      this.attach(event.clipboardData.files);
    }
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.attach(event.dataTransfer?.files);
  }

  private attach(files: FileList | null | undefined): void {
    if (files?.length && this.status() === 'open' && !this.ended()) {
      this.attached.emit([...files]);
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
