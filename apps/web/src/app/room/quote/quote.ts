import { Component, input } from '@angular/core';
import { Quote, describe } from '../../chats/attachment';
import { avatarHue } from '../avatar-hue';

@Component({
  selector: 'app-quote',
  host: {
    class:
      'person-ink flex items-center gap-2 rounded-lg border-l-4 border-current bg-glass-strong/50 py-1 pr-1 pl-2',
    '[style.--hue]': 'avatarHue(quote().name)',
  },
  template: `
    <span class="flex min-w-0 flex-1 flex-col py-0.5">
      <span class="text-xs font-semibold">{{ quote().own ? 'You' : quote().name }}</span>
      <span class="line-clamp-2 text-xs text-ink-soft">{{
        quote().file ? describe(quote().file!) : quote().text
      }}</span>
    </span>
    @if (quote().file?.kind === 'image' || quote().file?.kind === 'sticker') {
      <img [src]="quote().file!.url" alt="" class="size-10 shrink-0 rounded-md object-cover" />
    }
  `,
})
export class QuoteCard {
  readonly quote = input.required<Quote>();

  protected readonly avatarHue = avatarHue;
  protected readonly describe = describe;
}
