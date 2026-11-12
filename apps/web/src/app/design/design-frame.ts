import { Component, effect, inject, input } from '@angular/core';
import { I18n, Language } from '../i18n/i18n';
import { Theme, ThemeMode } from '../theme/theme';
import { ChatsState, DesignChats, DesignView, chatsStates } from './design-chats';

export const designScreens = chatsStates;
export type DesignScreen = ChatsState;

@Component({
  imports: [DesignChats],
  selector: 'app-design-frame',
  template: `<app-design-chats [state]="screen()" [view]="view()" [lang]="lang()" />`,
})
export class DesignFrame {
  readonly screen = input<DesignScreen>('chats');
  readonly view = input<DesignView>('chat');
  readonly theme = input<ThemeMode>('light');
  readonly lang = input<Language>('en');

  constructor() {
    const theme = inject(Theme);
    effect(() => theme.show(this.theme()));
    const i18n = inject(I18n);
    effect(() => i18n.use(this.lang()));
  }
}
