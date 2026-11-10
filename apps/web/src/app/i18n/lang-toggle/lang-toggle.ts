import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { I18n } from '../i18n';

@Component({
  imports: [TranslocoPipe],
  selector: 'app-lang-toggle',
  template: `
    <button
      type="button"
      class="grid size-10 place-items-center rounded-full border border-edge bg-glass-strong/50 text-xs font-semibold uppercase transition hover:bg-glass-strong focus-visible:outline-2 focus-visible:outline-accent-ink"
      [attr.aria-label]="'language.switch' | transloco"
      (click)="i18n.toggle()"
    >
      {{ i18n.lang() }}
    </button>
  `,
})
export class LangToggle {
  protected readonly i18n = inject(I18n);
}
