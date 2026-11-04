import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { Glass } from '../../glass/glass';

@Component({
  imports: [Glass, LucideArrowLeft, RouterLink],
  selector: 'app-room-notice',
  template: `
    <main class="scroll-glass flex h-dvh items-center justify-center overflow-y-auto p-3">
      <section
        appGlass
        class="flex w-full max-w-md animate-appear flex-col items-center gap-5 rounded-[2rem] motion-reduce:animate-none px-6 py-10 text-center md:px-10"
      >
        <span
          class="grid size-14 place-items-center rounded-2xl border border-edge bg-glass-strong text-accent-ink"
          aria-hidden="true"
        >
          <ng-content select="[icon]" />
        </span>
        <div class="flex flex-col gap-2">
          <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{{ heading() }}</h1>
          <p class="text-ink-soft"><ng-content /></p>
        </div>
        <a
          routerLink="/"
          appGlass="primary"
          class="flex items-center gap-2 rounded-full px-6 py-3 font-semibold shadow-lift transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          <svg lucideArrowLeft class="size-4" aria-hidden="true"></svg>
          Go to the home page
        </a>
      </section>
    </main>
  `,
})
export class RoomNotice {
  readonly heading = input.required<string>();
}
