import { Component, effect, inject, input } from '@angular/core';
import { Theme, ThemeMode } from '../theme/theme';
import { ChatsState, DesignChats, PhotoView, chatsStates } from './design-chats';

export const designScreens = chatsStates;
export type DesignScreen = ChatsState;

@Component({
  imports: [DesignChats],
  selector: 'app-design-frame',
  template: `<app-design-chats [state]="screen()" [view]="view()" />`,
})
export class DesignFrame {
  readonly screen = input<DesignScreen>('chats');
  readonly view = input<PhotoView>('chat');
  readonly theme = input<ThemeMode>('light');

  constructor() {
    const theme = inject(Theme);
    effect(() => theme.show(this.theme()));
  }
}
