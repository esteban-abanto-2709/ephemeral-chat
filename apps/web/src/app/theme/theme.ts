import { DOCUMENT, Service, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Service()
export class Theme {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly _mode = signal<ThemeMode>(this.root.dataset['theme'] === 'dark' ? 'dark' : 'light');
  readonly mode = this._mode.asReadonly();

  show(mode: ThemeMode): void {
    this._mode.set(mode);
    this.root.dataset['theme'] = mode;
  }

  toggle(): void {
    const mode = this._mode() === 'dark' ? 'light' : 'dark';
    this._mode.set(mode);
    this.root.dataset['theme'] = mode;
    try {
      localStorage.setItem('theme', mode);
    } catch {}
  }
}
