import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideDownload, LucideX } from '@lucide/angular';
import { ChatEvent } from '../../chats/chat-client';
import { avatarHue } from '../avatar-hue';

@Component({
  imports: [DatePipe, LucideDownload, LucideX],
  selector: 'app-photo-viewer',
  templateUrl: './photo-viewer.html',
})
export class PhotoViewer {
  readonly message = input.required<Extract<ChatEvent, { type: 'message' }>>();
  readonly closed = output();

  protected readonly avatarHue = avatarHue;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }
}
