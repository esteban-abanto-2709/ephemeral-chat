import { Service, signal } from '@angular/core';

@Service()
export class Notice {
  private readonly _text = signal<string | null>(null);
  private readonly _done = signal(false);
  readonly text = this._text.asReadonly();
  readonly done = this._done.asReadonly();
  private timer?: ReturnType<typeof setTimeout>;

  show(text: string, done = false): void {
    this._text.set(text);
    this._done.set(done);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._text.set(null), 2500);
  }
}
