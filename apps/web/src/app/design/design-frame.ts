import { Component, computed, effect, inject, input } from '@angular/core';
import { HomePage } from '../home/home-page';
import { Theme, ThemeMode } from '../theme/theme';
import { ChatsState, DesignChats } from './design-chats';
import { DesignRoom } from './design-room';

export const designScreens = ['home', 'room', 'start', 'chats', 'new group', 'group', 'private', 'left'] as const;
export type DesignScreen = (typeof designScreens)[number];

@Component({
  imports: [DesignChats, DesignRoom, HomePage],
  selector: 'app-design-frame',
  template: `
    @switch (screen()) {
      @case ('home') {
        <app-home-page />
      }
      @case ('room') {
        <app-design-room />
      }
      @default {
        <app-design-chats [state]="chatsState()" />
      }
    }
  `,
})
export class DesignFrame {
  readonly screen = input<DesignScreen>('room');
  readonly theme = input<ThemeMode>('light');
  protected readonly chatsState = computed(() => this.screen() as ChatsState);

  constructor() {
    const theme = inject(Theme);
    effect(() => theme.show(this.theme()));
  }
}
