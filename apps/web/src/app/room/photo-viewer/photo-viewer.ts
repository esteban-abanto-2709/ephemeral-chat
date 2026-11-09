import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideDownload, LucideX } from '@lucide/angular';
import { ChatMessage } from '../../chats/chat-client';
import { avatarHue } from '../avatar-hue';
import { LinkedText } from '../linked-text/linked-text';

@Component({
  imports: [DatePipe, LinkedText, LucideDownload, LucideX],
  selector: 'app-photo-viewer',
  templateUrl: './photo-viewer.html',
})
export class PhotoViewer {
  readonly message = input.required<ChatMessage>();
  readonly closed = output();

  protected readonly avatarHue = avatarHue;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected close(event?: Event): void {
    event?.preventDefault();
    this.dialog().nativeElement.close();
  }
}
