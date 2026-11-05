import { DOCUMENT, Directive, inject, input } from '@angular/core';
import { Notice } from '../../notice';

@Directive({
  selector: 'button[appCopyLink]',
  host: { type: 'button', '(click)': 'copy()' },
})
export class CopyLink {
  readonly appCopyLink = input.required<string>();
  readonly copied = input('Link copied');

  private readonly notice = inject(Notice);
  private readonly document = inject(DOCUMENT);

  protected copy(): void {
    this.document.defaultView?.navigator.clipboard
      .writeText(this.appCopyLink())
      .then(() => this.notice.show(this.copied(), true));
  }
}
