import { Component, computed, signal } from '@angular/core';
import { DesignDevice } from './design-device';
import { DesignScreen, designScreens } from './design-frame';

@Component({
  imports: [DesignDevice],
  selector: 'app-design-board',
  template: `
    <div class="scroll-glass relative h-dvh overflow-y-auto bg-canvas">
      <div class="mx-auto flex max-w-[1600px] flex-col gap-8 p-6">
        <header class="flex flex-wrap items-center gap-4">
          <h1 class="flex-1 text-xl font-semibold">Design</h1>
          <div class="flex gap-1.5" role="radiogroup" aria-label="Screen">
            @for (option of screens; track option) {
              <button
                type="button"
                role="radio"
                class="rounded-full border border-edge px-4 py-1.5 text-sm capitalize transition"
                [class.bg-accent]="screen() === option"
                [class.text-on-accent]="screen() === option"
                [attr.aria-checked]="screen() === option"
                (click)="screen.set(option)"
              >
                {{ option }}
              </button>
            }
          </div>
        </header>

        <section class="flex flex-col gap-3" aria-label="Desktop">
          <h2 class="text-sm font-semibold text-ink-soft">Desktop · 1280 × 800</h2>
          <div class="grid gap-6 lg:grid-cols-2">
            @for (theme of themes; track theme) {
              <app-design-device [label]="theme" [src]="frame(theme)" [width]="1280" [height]="800" />
            }
          </div>
        </section>

        <section class="flex flex-col gap-3" aria-label="Mobile">
          <h2 class="text-sm font-semibold text-ink-soft">Mobile · 390 × 844</h2>
          <div class="flex flex-wrap gap-6">
            @for (theme of themes; track theme) {
              <app-design-device class="w-[390px]" [label]="theme" [src]="frame(theme)" [width]="390" [height]="844" />
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class DesignBoard {
  protected readonly screens = designScreens;
  protected readonly themes = ['light', 'dark'] as const;
  protected readonly screen = signal<DesignScreen>('room');
  private readonly query = computed(() => `/design/frame?screen=${this.screen()}`);

  protected frame(theme: string): string {
    return `${this.query()}&theme=${theme}`;
  }
}
