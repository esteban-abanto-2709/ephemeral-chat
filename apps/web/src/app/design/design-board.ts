import { Component, computed, signal } from '@angular/core';
import { DesignDevice } from './design-device';
import { DesignView, photoViews, qrViews } from './design-chats';
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
                [class.bg-glass-strong]="screen() === option"
                [class.font-semibold]="screen() === option"
                [attr.aria-checked]="screen() === option"
                (click)="pick(option)"
              >
                {{ option }}
              </button>
            }
          </div>
          @if (views().length) {
            <div class="flex basis-full justify-end gap-1.5" role="radiogroup" aria-label="View">
              @for (option of views(); track option) {
                <button
                  type="button"
                  role="radio"
                  class="rounded-full border border-edge px-3 py-1 text-xs capitalize transition"
                  [class.bg-glass-strong]="view() === option"
                  [class.font-semibold]="view() === option"
                  [attr.aria-checked]="view() === option"
                  (click)="view.set(option)"
                >
                  {{ option }}
                </button>
              }
            </div>
          }
        </header>

        <section class="flex flex-col gap-3" aria-label="Desktop">
          <h2 class="text-sm font-semibold text-ink-soft">Desktop · 1280 × 800</h2>
          <div class="grid gap-6 lg:grid-cols-2">
            @for (theme of themes; track theme) {
              <app-design-device
                [label]="theme"
                [src]="frame(theme)"
                [width]="1280"
                [height]="800"
              />
            }
          </div>
        </section>

        <section class="flex flex-col gap-3" aria-label="Mobile">
          <h2 class="text-sm font-semibold text-ink-soft">Mobile · 390 × 844</h2>
          <div class="flex flex-wrap gap-6">
            @for (theme of themes; track theme) {
              <app-design-device
                class="w-[390px]"
                [label]="theme"
                [src]="frame(theme)"
                [width]="390"
                [height]="844"
              />
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
  protected readonly screen = signal<DesignScreen>('chats');
  protected readonly view = signal<DesignView>('chat');
  protected readonly views = computed((): readonly DesignView[] =>
    this.screen() === 'photos' ? photoViews : this.screen() === 'qr' ? qrViews : [],
  );
  private readonly query = computed(
    () => `/design/frame?screen=${this.screen()}&view=${this.view()}`,
  );

  protected pick(screen: DesignScreen): void {
    this.screen.set(screen);
    this.view.set(screen === 'qr' ? 'invite' : 'chat');
  }

  protected frame(theme: string): string {
    return `${this.query()}&theme=${theme}`;
  }
}
