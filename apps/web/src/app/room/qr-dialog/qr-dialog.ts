import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucideCopy, LucideInfo, LucideLock, LucideUsersRound, LucideX } from '@lucide/angular';
import { encode } from 'uqr';
import { Glass } from '../../glass/glass';
import { CopyLink } from '../copy-link/copy-link';

export function qrPath(text: string): { size: number; path: string } {
  const { size, data } = encode(text, { ecc: 'M', border: 4 });
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');
  return { size, path };
}

@Component({
  imports: [CopyLink, Glass, LucideCopy, LucideInfo, LucideLock, LucideUsersRound, LucideX],
  selector: 'app-qr-dialog',
  templateUrl: './qr-dialog.html',
})
export class QrDialog {
  readonly kind = input.required<'private' | 'group'>();
  readonly title = input('');
  readonly url = input.required<string>();
  readonly closed = output();

  protected readonly qr = computed(() => qrPath(this.url()));
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected close(event?: Event): void {
    event?.preventDefault();
    this.dialog().nativeElement.close();
  }

  protected closeOutside(event: Event): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
