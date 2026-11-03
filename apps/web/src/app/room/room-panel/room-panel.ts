import { Component, DOCUMENT, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideCopy, LucideHourglass, LucideShieldCheck, LucideX } from '@lucide/angular';
import { ThemeToggle } from '../../theme/theme-toggle/theme-toggle';
import { avatarColor } from '../avatar-color';

@Component({
  imports: [
    LucideCheck,
    LucideCopy,
    LucideHourglass,
    LucideShieldCheck,
    LucideX,
    RouterLink,
    ThemeToggle,
  ],
  selector: 'app-room-panel',
  templateUrl: './room-panel.html',
})
export class RoomPanel {
  readonly link = input.required<string>();
  readonly members = input.required<string[]>();
  readonly me = input.required<string>();
  readonly closed = output();

  protected readonly avatarColor = avatarColor;
  protected readonly copied = signal(false);
  private readonly document = inject(DOCUMENT);

  protected copyLink(): void {
    this.document.defaultView?.navigator.clipboard.writeText(this.link()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
