import { Component, computed, inject } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { Glass } from '../../glass/glass';
import { Theme } from '../theme';

@Component({
  imports: [Glass, LucideMoon, LucideSun],
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      role="switch"
      appGlass
      class="relative flex h-10 w-22 items-center rounded-full px-3 text-sm font-medium text-ink-soft focus-visible:outline-2 focus-visible:outline-accent"
      [class.justify-end]="!dark()"
      aria-label="Dark theme"
      [attr.aria-checked]="dark()"
      (click)="theme.toggle()"
    >
      <span aria-hidden="true">{{ dark() ? 'Dark' : 'Light' }}</span>
      <span
        appGlass
        class="absolute top-0.5 left-0.5 grid size-9 place-items-center rounded-full text-ink transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
        [class.translate-x-12]="dark()"
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
}
