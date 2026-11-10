import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { Glass } from '../../glass/glass';
import { Theme } from '../theme';

@Component({
  imports: [Glass, LucideMoon, LucideSun, TranslocoPipe],
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      role="switch"
      appGlass
      class="relative flex h-10 w-26 items-center rounded-full px-3 text-sm font-medium text-ink-soft focus-visible:outline-2 focus-visible:outline-accent-ink"
      [class.justify-end]="!dark()"
      [attr.aria-label]="'theme.label' | transloco"
      [attr.aria-checked]="dark()"
      (click)="theme.toggle()"
    >
      <span aria-hidden="true">{{ (dark() ? 'theme.dark' : 'theme.light') | transloco }}</span>
      <span
        appGlass
        class="absolute top-px left-px grid size-9 place-items-center rounded-full text-ink ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
        [class.translate-x-16]="dark()"
        [class.transition-transform]="animate()"
        [class.duration-500]="animate()"
        aria-hidden="true"
      >
        @if (dark()) {
          <svg lucideMoon class="size-4 drop-shadow-[0_0_6px_currentColor]"></svg>
        } @else {
          <svg lucideSun class="size-4 drop-shadow-[0_0_6px_currentColor]"></svg>
        }
      </span>
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(Theme);
  protected readonly dark = computed(() => this.theme.mode() === 'dark');
  protected readonly animate = signal(false);

  constructor() {
    afterNextRender(() => this.animate.set(true));
  }
}
