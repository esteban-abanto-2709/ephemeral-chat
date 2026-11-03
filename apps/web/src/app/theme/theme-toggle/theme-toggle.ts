import { Component, computed, inject } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { Theme } from '../theme';

@Component({
  imports: [LucideMoon, LucideSun],
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      class="glass grid size-10 place-items-center rounded-full text-ink transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-accent"
      [attr.aria-label]="label()"
      (click)="theme.toggle()"
    >
      @if (theme.mode() === 'dark') {
        <svg lucideSun class="size-5" aria-hidden="true"></svg>
      } @else {
        <svg lucideMoon class="size-5" aria-hidden="true"></svg>
      }
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(Theme);
  protected readonly label = computed(() =>
    this.theme.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
  );
}
