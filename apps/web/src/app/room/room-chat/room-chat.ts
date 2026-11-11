import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  LucideArrowLeft,
  LucideCopy,
  LucideImagePlus,
  LucideLock,
  LucideLogOut,
  LucideMic,
  LucidePaperclip,
  LucideQrCode,
  LucideRefreshCw,
  LucideShieldCheck,
  LucideTrash2,
  LucideSendHorizontal,
  LucideUsersRound,
  LucideWifiOff,
  LucideX,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { Attachment, Outgoing, Quote, duration } from '../../chats/attachment';
import { ChatEvent, ChatMessage, Person, SocketStatus, quoteOf } from '../../chats/chat-client';
import { Glass } from '../../glass/glass';
import { I18n } from '../../i18n/i18n';
import { avatarHue, initials } from '../avatar-hue';
import { CopyLink } from '../copy-link/copy-link';
import { MessageList } from '../message-list/message-list';
import { PhotoViewer } from '../photo-viewer/photo-viewer';
import { QuoteCard } from '../quote/quote';
import { Notice } from '../../notice';
import { SendPreview } from '../send-preview/send-preview';
import { VoiceRecorder } from './voice-recorder';

const messageMaxLength = 1000;
const voiceMaxSeconds = 60;

@Component({
  imports: [
    CopyLink,
    Glass,
    LucideArrowLeft,
    LucideCopy,
    LucideImagePlus,
    LucideLock,
    LucideLogOut,
    LucideMic,
    LucidePaperclip,
    LucideQrCode,
    LucideRefreshCw,
    LucideShieldCheck,
    LucideTrash2,
    LucideSendHorizontal,
    LucideUsersRound,
    LucideWifiOff,
    LucideX,
    MessageList,
    PhotoViewer,
    QuoteCard,
    SendPreview,
    TranslocoPipe,
  ],
  selector: 'app-room-chat',
  host: {
    class: 'relative flex min-w-0 flex-1 flex-col',
    '(dragover)': '$event.preventDefault()',
    '(dragenter)': 'dragging.set(true)',
    '(dragleave)': 'leave($event)',
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
  readonly read = input(0);
  readonly focus = input(false);
  readonly recording = input<number | null>(null);
  readonly replying = input<Quote | null>(null);
  readonly preview = input<Attachment[]>([]);
  readonly sent = output<{ text: string; reply?: number }>();
  readonly attached = output<File[]>();
  readonly filesSent = output<{ items: Outgoing[]; original: boolean }>();
  readonly filesDiscarded = output();
  readonly voiced = output<{ blob: Blob; seconds: number; reply?: number }>();
  readonly reconnect = output();
  readonly showQr = output();
  readonly typed = output();
  readonly closed = output();
  readonly deleted = output();

  protected readonly avatarHue = avatarHue;
  protected readonly initials = initials;
  protected readonly duration = duration;
  protected readonly voiceMaxSeconds = voiceMaxSeconds;
  protected readonly canRecord = VoiceRecorder.supported();
  protected readonly recorder = new VoiceRecorder(voiceMaxSeconds, () => this.sendVoice());
  protected readonly recordingSeconds = computed(() => this.recorder.seconds() ?? this.recording());
  private readonly notice = inject(Notice);
  private readonly i18n = inject(I18n);
  protected readonly subtitle = computed(() => {
    const [first, second, ...rest] = this.typing().map((person) => person.name);
    if (this.status() !== 'open') {
      return this.i18n.t(`room.status.${this.status()}`);
    }
    if (!first && this.kind() === 'private') {
      return this.i18n.t(this.ended() ? 'room.leftChat' : 'room.online');
    }
    if (!first) {
      const others = this.members().filter((member) => member.id !== this.me());
      return [...others.map((member) => member.name), this.i18n.t('room.you')].join(', ');
    }
    if (!second) {
      return this.i18n.t('room.typing.one', { name: first });
    }
    return rest.length
      ? this.i18n.t('room.typing.many', { first, count: rest.length + 1 })
      : this.i18n.t('room.typing.two', { first, second });
  });

  private readonly composer = viewChild<ElementRef<HTMLInputElement>>('input');
  private readonly finePointer =
    !!inject(DOCUMENT).defaultView?.matchMedia?.('(pointer: fine)').matches;

  constructor() {
    effect(() => {
      this.code();
      untracked(() => this.recorder.cancel());
    });
    inject(DestroyRef).onDestroy(() => this.recorder.cancel());
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
  protected readonly dragging = signal(false);
  protected readonly viewing = signal<ChatMessage | null>(null);
  protected readonly quoting = linkedSignal(() => {
    this.code();
    return this.replying();
  });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

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

  protected leave(event: DragEvent): void {
    if (!this.host.contains(event.relatedTarget as Node | null)) {
      this.dragging.set(false);
    }
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.attach(event.dataTransfer?.files);
  }

  private attach(files: FileList | null | undefined): void {
    if (files?.length && this.status() === 'open' && !this.ended()) {
      this.attached.emit([...files]);
    }
  }

  protected record(): void {
    this.recorder.start().catch(() => this.notice.show(this.i18n.t('errors.microphone')));
  }

  protected async sendVoice(): Promise<void> {
    const voice = await this.recorder.stop();
    if (voice) {
      this.voiced.emit({ ...voice, reply: this.quoting()?.seq });
      this.quoting.set(null);
    }
  }

  protected reply(message: ChatMessage): void {
    this.quoting.set(quoteOf(message));
    this.composer()?.nativeElement.focus();
  }

  protected send(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }
    this.sent.emit({ text, reply: this.quoting()?.seq });
    this.quoting.set(null);
    input.value = '';
    this.length.set(0);
  }
}
