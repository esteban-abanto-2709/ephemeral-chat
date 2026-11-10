import { DOCUMENT, Directive, inject, input } from '@angular/core';
import { I18n } from '../../i18n/i18n';
import { Notice } from '../../notice';

@Directive({
  selector: 'button[appCopyLink]',
  host: { type: 'button', '(click)': 'copy()' },
})
export class CopyLink {
  readonly appCopyLink = input.required<string>();
  readonly copied = input<string>();

  private readonly notice = inject(Notice);
  private readonly i18n = inject(I18n);
  private readonly document = inject(DOCUMENT);

  protected copy(): void {
    this.document.defaultView?.navigator.clipboard
      .writeText(this.appCopyLink())
      .then(() => this.notice.show(this.copied() ?? this.i18n.t('copy.link'), true));
  }
}
