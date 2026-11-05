import { Component, input, output } from '@angular/core';
import { LucideHourglass, LucideIdCard, LucideKeyRound, LucideUsersRound } from '@lucide/angular';
import { CopyLink } from '../room/copy-link/copy-link';
import { Glass } from '../glass/glass';

@Component({
  imports: [CopyLink, Glass, LucideHourglass, LucideIdCard, LucideKeyRound, LucideUsersRound],
  selector: 'app-chats-welcome',
  host: { class: 'min-w-0 flex-1 items-center justify-center p-6' },
  template: `
    <section appGlass="card" class="flex max-w-md flex-col items-center gap-6 rounded-[2rem] px-10 py-10 text-center">
      <span
        class="grid size-14 place-items-center rounded-2xl border border-edge bg-glass-strong text-accent-ink"
        aria-hidden="true"
      >
        <svg lucideHourglass class="size-7"></svg>
      </span>
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold tracking-tight">Talk, then let it go</h1>
        <p class="text-ink-soft">
          Nothing is stored. A chat vanishes when everyone leaves, and your ID when you close this tab.
        </p>
      </div>
      <ul class="flex gap-6">
        <li>
          <button
            type="button"
            class="group flex w-24 flex-col items-center gap-2 text-xs font-medium"
            (click)="newGroup.emit()"
          >
            <span
              appGlass="bubble"
              class="grid size-14 place-items-center rounded-full transition group-hover:scale-105"
              aria-hidden="true"
            >
              <svg lucideUsersRound class="size-5"></svg>
            </span>
            New group
          </button>
        </li>
        <li>
          <button
            type="button"
            class="group flex w-24 flex-col items-center gap-2 text-xs font-medium"
            (click)="joinWithCode.emit()"
          >
            <span
              appGlass="bubble"
              class="grid size-14 place-items-center rounded-full transition group-hover:scale-105"
              aria-hidden="true"
            >
              <svg lucideKeyRound class="size-5"></svg>
            </span>
            Join with code
          </button>
        </li>
        <li>
          <button
            [appCopyLink]="me()"
            copied="ID copied"
            [disabled]="!me()"
            class="group flex w-24 flex-col items-center gap-2 text-xs font-medium disabled:opacity-50"
          >
            <span
              appGlass="bubble"
              class="grid size-14 place-items-center rounded-full transition group-hover:scale-105"
              aria-hidden="true"
            >
              <svg lucideIdCard class="size-5"></svg>
            </span>
            Copy my ID
          </button>
        </li>
      </ul>
    </section>
  `,
})
export class ChatsWelcome {
  readonly me = input('');
  readonly newGroup = output();
  readonly joinWithCode = output();
}
