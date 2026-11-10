import {
  Component,
  ElementRef,
  computed,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideFile,
  LucideFileText,
  LucidePlus,
  LucideSendHorizontal,
  LucideX,
} from '@lucide/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { Attachment, Outgoing, fileSize } from '../../chats/attachment';
import { Glass } from '../../glass/glass';

@Component({
  imports: [
    Glass,
    LucideFile,
    LucideFileText,
    LucidePlus,
    LucideSendHorizontal,
    LucideX,
    TranslocoPipe,
  ],
  selector: 'app-send-preview',
  host: { class: 'flex flex-col', '(keydown.escape)': 'confirm($event)' },
  templateUrl: './send-preview.html',
})
export class SendPreview {
  readonly files = input.required<Attachment[]>();
  readonly to = input.required<string>();
  readonly sent = output<{ items: Outgoing[]; original: boolean }>();
  readonly discarded = output();
  readonly added = output();

  protected readonly fileSize = fileSize;
  protected readonly items = linkedSignal<Attachment[], Outgoing[]>({
    source: this.files,
    computation: (files, previous) => [
      ...(previous?.value ?? []),
      ...files
        .filter((file) => !previous?.source.includes(file))
        .map((file) => ({ file, caption: '' })),
    ],
  });
  protected readonly selected = linkedSignal<Outgoing[], number>({
    source: this.items,
    computation: (items, previous) => Math.min(previous?.value ?? 0, items.length - 1),
  });
  protected readonly current = computed(() => this.items()[this.selected()]);
  protected readonly original = signal(false);

  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('confirmation');

  protected write(caption: string): void {
    const index = this.selected();
    this.items.update((items) =>
      items.map((item, i) => (i === index ? { ...item, caption } : item)),
    );
  }

  protected remove(index: number): void {
    if (this.items().length === 1) {
      this.discarded.emit();
      return;
    }
    this.items.update((items) => items.filter((_, i) => i !== index));
  }

  protected confirm(event: Event): void {
    event.preventDefault();
    this.dialog().nativeElement.showModal();
  }

  protected discard(): void {
    this.dialog().nativeElement.close();
    this.discarded.emit();
  }

  protected send(): void {
    this.sent.emit({ items: this.items(), original: this.original() });
  }
}
