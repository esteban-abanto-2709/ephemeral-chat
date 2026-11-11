import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Theme, ThemeMode } from '../theme/theme';
import { DesignDevice } from './design-device';

interface Stroke {
  readonly d: string;
  readonly opacity?: number;
  readonly dash?: string;
  readonly fill?: boolean;
  readonly width?: number;
}

interface Mark {
  readonly name: string;
  readonly note: string;
  readonly strokes: readonly Stroke[];
}

const marks: readonly Mark[] = [
  {
    name: 'Now · Hourglass',
    note: 'Says ephemeral, not chat.',
    strokes: [
      { d: 'M5 22h14' },
      { d: 'M5 2h14' },
      { d: 'M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22' },
      { d: 'M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2' },
    ],
  },
  {
    name: 'A · Dissolving bubble',
    note: 'The outline breaks into dots that fade.',
    strokes: [
      { d: 'M13 4H7a3 3 0 0 0-3 3v14l4-4h4' },
      { d: 'M16.5 4h0' },
      { d: 'M20.2 5.3h0', opacity: 0.8 },
      { d: 'M21 10h0', opacity: 0.6 },
      { d: 'M20.4 15.4h0', opacity: 0.4 },
      { d: 'M16 17h0', opacity: 0.25 },
    ],
  },
  {
    name: 'B · Bubble hourglass',
    note: 'A bubble with the sand inside: keeps the old mark.',
    strokes: [
      { d: 'M7 4h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8l-4 4V7a3 3 0 0 1 3-3z' },
      { d: 'M9.5 7.5h5L12 10.5z', fill: true, width: 1 },
      { d: 'M9.5 13.5h5L12 10.5z', fill: true, width: 1 },
    ],
  },
  {
    name: 'C · Open bubble',
    note: 'One stroke that never closes, as if being erased.',
    strokes: [{ d: 'M14 4H7a3 3 0 0 0-3 3v14l4-4h10a3 3 0 0 0 3-3v-4' }],
  },
  {
    name: 'D · Escaping dots',
    note: 'The typing dots leave the bubble and drift away.',
    strokes: [
      {
        d: 'M5.5 9h7a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H7l-4 4V11.5A2.5 2.5 0 0 1 5.5 9z',
      },
      { d: 'M7 13.5h0' },
      { d: 'M11 13.5h0' },
      { d: 'M18 8.5h0', opacity: 0.7 },
      { d: 'M21 4h0', opacity: 0.4 },
    ],
  },
  {
    name: 'E · Two bubbles',
    note: 'The last conversation is already gone behind this one.',
    strokes: [
      {
        d: 'M8 7V4.5A2.5 2.5 0 0 1 10.5 2h9A2.5 2.5 0 0 1 22 4.5V16l-4-4h-2',
        dash: '2 2.6',
        opacity: 0.5,
      },
      {
        d: 'M4.5 9h7a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H6l-4 4V11.5A2.5 2.5 0 0 1 4.5 9z',
      },
    ],
  },
];

@Component({
  selector: 'app-design-logo-sheet',
  host: { class: 'block min-h-dvh bg-canvas p-6 text-ink' },
  template: `
    <ul class="flex flex-col gap-4">
      @for (mark of marks; track mark.name) {
        <li class="flex items-center gap-6 rounded-2xl border border-edge bg-glass-strong p-4">
          <div class="flex w-44 flex-col gap-1">
            <p class="text-sm font-semibold">{{ mark.name }}</p>
            <p class="text-xs text-ink-soft">{{ mark.note }}</p>
          </div>
          <div class="flex flex-1 items-end gap-5 text-accent-ink">
            @for (size of sizes; track size) {
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                [attr.width]="size"
                [attr.height]="size"
                [attr.aria-label]="mark.name + ' ' + size"
              >
                @for (stroke of mark.strokes; track $index) {
                  <path
                    [attr.d]="stroke.d"
                    [attr.opacity]="stroke.opacity ?? null"
                    [attr.stroke-dasharray]="stroke.dash ?? null"
                    [attr.fill]="stroke.fill ? 'currentColor' : null"
                    [attr.stroke-width]="stroke.width ?? null"
                  />
                }
              </svg>
            }
            <span
              class="grid size-14 place-items-center rounded-2xl border border-edge bg-glass-strong"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-7"
              >
                @for (stroke of mark.strokes; track $index) {
                  <path
                    [attr.d]="stroke.d"
                    [attr.opacity]="stroke.opacity ?? null"
                    [attr.stroke-dasharray]="stroke.dash ?? null"
                    [attr.fill]="stroke.fill ? 'currentColor' : null"
                    [attr.stroke-width]="stroke.width ?? null"
                  />
                }
              </svg>
            </span>
          </div>
        </li>
      }
    </ul>
  `,
})
export class DesignLogoSheet {
  readonly theme = input<ThemeMode>('light');
  protected readonly marks = marks;
  protected readonly sizes = [16, 20, 28, 64];

  constructor() {
    const theme = inject(Theme);
    effect(() => theme.show(this.theme()));
  }
}

@Component({
  imports: [DesignDevice, RouterLink],
  selector: 'app-design-logos',
  template: `
    <div class="scroll-glass relative h-dvh overflow-y-auto bg-canvas">
      <div class="mx-auto flex max-w-[1600px] flex-col gap-6 p-6">
        <header class="flex items-center gap-4">
          <h1 class="flex-1 text-xl font-semibold">Logos</h1>
          <a routerLink="/design" class="rounded-full border border-edge px-4 py-1.5 text-sm">
            Board
          </a>
        </header>
        <div class="grid gap-6 lg:grid-cols-2">
          @for (theme of themes; track theme) {
            <app-design-device
              [label]="theme"
              [src]="'/design/logos/sheet?theme=' + theme"
              [width]="720"
              [height]="820"
            />
          }
        </div>
      </div>
    </div>
  `,
})
export class DesignLogos {
  protected readonly themes = ['light', 'dark'] as const;
}
