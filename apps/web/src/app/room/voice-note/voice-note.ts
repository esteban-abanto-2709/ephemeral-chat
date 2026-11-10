import { Component, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucidePause, LucidePlay } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { Attachment, duration } from '../../chats/attachment';

let playing: HTMLAudioElement | null = null;

@Component({
  imports: [DatePipe, LucidePause, LucidePlay, TranslocoPipe],
  selector: 'app-voice-note',
  host: { class: 'flex w-64 max-w-full items-center gap-3 py-1 pr-2.5 pl-1' },
  template: `
    <audio
      #audio
      [src]="file().url"
      preload="metadata"
      (timeupdate)="elapsed.set(audio.currentTime)"
      (play)="started(audio)"
      (pause)="paused.set(true)"
      (ended)="ended()"
    ></audio>
    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-full bg-accent-ink text-canvas transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-accent-ink"
      [attr.aria-label]="(paused() ? 'voice.play' : 'voice.pause') | transloco"
      (click)="toggle(audio)"
    >
      @if (paused()) {
        <svg lucidePlay class="size-4 fill-current" aria-hidden="true"></svg>
      } @else {
        <svg lucidePause class="size-4 fill-current" aria-hidden="true"></svg>
      }
    </button>
    <span class="flex min-w-0 flex-1 flex-col gap-1.5">
      <span class="h-1 overflow-hidden rounded-full bg-edge">
        <span class="block h-full bg-accent-ink" [style.width.%]="progress()"></span>
      </span>
      <span class="flex justify-between text-[0.6875rem] text-ink-soft">
        <span>{{ duration(elapsed() || (file().seconds ?? 0)) }}</span>
        <time>{{ at() | date: 'HH:mm' }}</time>
      </span>
    </span>
  `,
})
export class VoiceNote {
  readonly file = input.required<Attachment>();
  readonly at = input.required<number>();

  protected readonly duration = duration;
  protected readonly elapsed = signal(0);
  protected readonly paused = signal(true);
  protected readonly progress = computed(() =>
    Math.min(100, (this.elapsed() / (this.file().seconds || 1)) * 100),
  );

  protected toggle(audio: HTMLAudioElement): void {
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  protected started(audio: HTMLAudioElement): void {
    if (playing && playing !== audio) {
      playing.pause();
    }
    playing = audio;
    this.paused.set(false);
  }

  protected ended(): void {
    this.paused.set(true);
    this.elapsed.set(0);
  }
}
