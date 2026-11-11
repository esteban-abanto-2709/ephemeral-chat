import { Component, DOCUMENT, computed, inject, input, output } from '@angular/core';
import { LucideIdCard, LucideLink, LucideQrCode, LucideUsersRound } from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { CopyLink } from '../room/copy-link/copy-link';
import { Glass } from '../glass/glass';
import { Logo } from '../logo/logo';

@Component({
  imports: [
    CopyLink,
    Glass,
    Logo,
    LucideIdCard,
    LucideLink,
    LucideQrCode,
    LucideUsersRound,
    TranslocoPipe,
  ],
  selector: 'app-chats-welcome',
  host: { class: 'min-w-0 flex-1 items-center justify-center p-6' },
  template: `
    <section
      appGlass="card"
      class="flex max-w-md flex-col items-center gap-6 rounded-[2rem] px-10 py-10 text-center"
    >
      <span
        class="grid size-14 place-items-center rounded-2xl border border-edge bg-glass-strong text-accent-ink"
        aria-hidden="true"
      >
        <svg appLogo class="size-7"></svg>
      </span>
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold tracking-tight">{{ 'welcome.title' | transloco }}</h1>
        <p class="text-ink-soft">{{ 'welcome.body' | transloco }}</p>
      </div>
      <ul class="flex gap-3">
        <li>
          <button
            type="button"
            class="group flex w-20 flex-col items-center gap-2 text-xs font-medium"
            (click)="newGroup.emit()"
          >
            <span
              appGlass="bubble"
              class="grid size-14 place-items-center rounded-full transition group-hover:scale-105"
              aria-hidden="true"
            >
              <svg lucideUsersRound class="size-5"></svg>
            </span>
            {{ 'welcome.newGroup' | transloco }}
          </button>
        </li>
        <li>
          <button
            type="button"
            [disabled]="!me()"
            class="group flex w-20 flex-col items-center gap-2 text-xs font-medium disabled:opacity-50"
            (click)="showQr.emit()"
          >
            <span
              appGlass="bubble"
              class="grid size-14 place-items-center rounded-full transition group-hover:scale-105"
              aria-hidden="true"
            >
              <svg lucideQrCode class="size-5"></svg>
            </span>
            {{ 'welcome.myQr' | transloco }}
          </button>
        </li>
        <li>
          <button
            [appCopyLink]="invite()"
            [copied]="'copy.invite' | transloco"
            [disabled]="!me()"
            class="group flex w-20 flex-col items-center gap-2 text-xs font-medium disabled:opacity-50"
          >
            <span
              appGlass="bubble"
              class="grid size-14 place-items-center rounded-full transition group-hover:scale-105"
              aria-hidden="true"
            >
              <svg lucideLink class="size-5"></svg>
            </span>
            {{ 'welcome.invite' | transloco }}
          </button>
        </li>
        <li>
          <button
            [appCopyLink]="me()"
            [copied]="'copy.id' | transloco"
            [disabled]="!me()"
            class="group flex w-20 flex-col items-center gap-2 text-xs font-medium disabled:opacity-50"
          >
            <span
              appGlass="bubble"
              class="grid size-14 place-items-center rounded-full transition group-hover:scale-105"
              aria-hidden="true"
            >
              <svg lucideIdCard class="size-5"></svg>
            </span>
            {{ 'welcome.copyId' | transloco }}
          </button>
        </li>
      </ul>
    </section>
  `,
})
export class ChatsWelcome {
  readonly me = input('');
  readonly newGroup = output();
  readonly showQr = output();

  private readonly origin = inject(DOCUMENT).location.origin;
  protected readonly invite = computed(() => `${this.origin}/chat/${this.me()}`);
}
