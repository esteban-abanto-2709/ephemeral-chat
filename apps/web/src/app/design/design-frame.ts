import { Component, effect, inject, input } from '@angular/core';
import { HomePage } from '../home/home-page';
import { Theme, ThemeMode } from '../theme/theme';
import { DesignRoom } from './design-room';

export const designScreens = ['home', 'room'] as const;
export type DesignScreen = (typeof designScreens)[number];

@Component({
  imports: [DesignRoom, HomePage],
  selector: 'app-design-frame',
  template: `
    @switch (screen()) {
      @case ('home') {
        <app-home-page />
      }
      @default {
        <app-design-room />
      }
    }
  `,
})
export class DesignFrame {
  readonly screen = input<DesignScreen>('room');
  readonly theme = input<ThemeMode>('light');

  constructor() {
    const theme = inject(Theme);
    effect(() => theme.show(this.theme()));
  }
}
