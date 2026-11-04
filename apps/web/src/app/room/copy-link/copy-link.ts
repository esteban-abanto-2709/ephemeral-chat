import { DOCUMENT, Directive, Service, inject, input, signal } from '@angular/core';

@Service()
export class CopyNotice {
  private readonly _visible = signal(false);
  readonly visible = this._visible.asReadonly();
  private timer?: ReturnType<typeof setTimeout>;

  show(): void {
    this._visible.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._visible.set(false), 2000);
  }
}

@Directive({
  selector: 'button[appCopyLink]',
  host: { type: 'button', '(click)': 'copy()' },
})
export class CopyLink {
  readonly appCopyLink = input.required<string>();

  private readonly notice = inject(CopyNotice);
  private readonly document = inject(DOCUMENT);

  protected copy(): void {
    this.document.defaultView?.navigator.clipboard.writeText(this.appCopyLink()).then(() => this.notice.show());
  }
}
