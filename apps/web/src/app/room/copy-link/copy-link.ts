import { Component, DOCUMENT, inject, input, signal } from '@angular/core';
import { LucideCheck, LucideCopy } from '@lucide/angular';

@Component({
  imports: [LucideCheck, LucideCopy],
  selector: 'app-copy-link',
  template: `
    <button
      type="button"
      class="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium text-accent-ink transition hover:bg-glass-strong focus-visible:outline-2 focus-visible:outline-accent-ink"
      [class.px-4]="labelled()"
      [class.w-10]="!labelled()"
      [attr.aria-label]="labelled() ? null : copied() ? 'Link copied' : 'Copy link'"
      (click)="copy()"
    >
      @if (copied()) {
        <svg lucideCheck class="size-4" aria-hidden="true"></svg>
      } @else {
        <svg lucideCopy class="size-4" aria-hidden="true"></svg>
      }
      @if (labelled()) {
        {{ copied() ? 'Copied' : 'Copy link' }}
      }
    </button>
  `,
})
export class CopyLink {
  readonly link = input.required<string>();
  readonly labelled = input(false);

  protected readonly copied = signal(false);
  private readonly document = inject(DOCUMENT);

  protected copy(): void {
    this.document.defaultView?.navigator.clipboard.writeText(this.link()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
