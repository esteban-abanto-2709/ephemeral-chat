import { TestBed } from '@angular/core/testing';
import { provideI18n } from './app/i18n/i18n';

beforeEach(() => {
  localStorage.removeItem('lang');
  TestBed.configureTestingModule({ providers: [provideI18n()] });
});

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  if (this.open) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  }
};
