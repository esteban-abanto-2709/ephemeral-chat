import { Component, DOCUMENT, effect, inject, input } from '@angular/core';
import { I18n, Language } from '../i18n/i18n';
import { Theme, ThemeMode } from '../theme/theme';
import { ChatsState, DesignChats, DesignView, chatsStates } from './design-chats';

export const designScreens = chatsStates;
export type DesignScreen = ChatsState;

const accents = {
  green: null,
  ink: 'var(--ink)',
  mist: 'light-dark(oklch(0.5 0.08 255), oklch(0.82 0.06 255))',
} as const;
export type DesignAccent = keyof typeof accents;
export const designAccents = Object.keys(accents) as DesignAccent[];

@Component({
  imports: [DesignChats],
  selector: 'app-design-frame',
  template: `<app-design-chats [state]="screen()" [view]="view()" />`,
})
export class DesignFrame {
  readonly screen = input<DesignScreen>('chats');
  readonly view = input<DesignView>('chat');
  readonly theme = input<ThemeMode>('light');
  readonly lang = input<Language>('en');
  readonly accent = input<DesignAccent>('green');

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => {
      const value = accents[this.accent()];
      if (value) root.style.setProperty('--accent-ink', value);
      else root.style.removeProperty('--accent-ink');
    });
    const theme = inject(Theme);
    effect(() => theme.show(this.theme()));
    const i18n = inject(I18n);
    effect(() => i18n.use(this.lang()));
  }
}
