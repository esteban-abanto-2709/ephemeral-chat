import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideHourglass, LucideX } from '@lucide/angular';
import { ThemeToggle } from '../../theme/theme-toggle/theme-toggle';
import { avatarHue } from '../avatar-hue';

@Component({
  imports: [LucideHourglass, LucideX, RouterLink, ThemeToggle],
  selector: 'app-room-panel',
  templateUrl: './room-panel.html',
})
export class RoomPanel {
  readonly members = input.required<string[]>();
  readonly me = input.required<string>();
  readonly closed = output();

  protected readonly avatarHue = avatarHue;
}
