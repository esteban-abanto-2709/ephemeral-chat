import { Component, computed, input } from '@angular/core';
import { find } from 'linkifyjs';

export interface TextPart {
  text: string;
  href?: string;
}

export function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let from = 0;
  for (const { start, end, href } of find(text, 'url', { defaultProtocol: 'https' })) {
    if (!/^https?:/i.test(href)) {
      continue;
    }
    if (start > from) {
      parts.push({ text: text.slice(from, start) });
    }
    parts.push({ text: text.slice(start, end), href });
    from = end;
  }
  if (from < text.length) {
    parts.push({ text: text.slice(from) });
  }
  return parts;
}

@Component({
  selector: 'app-linked-text',
  template: `@for (part of parts(); track $index) {
    @if (part.href) {
      <a
        [href]="part.href"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-sm text-accent-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-accent-ink"
        (click)="$event.stopPropagation()"
        >{{ part.text }}</a
      >
    } @else {
      <span>{{ part.text }}</span>
    }
  }`,
})
export class LinkedText {
  readonly text = input.required<string>();

  protected readonly parts = computed(() => linkParts(this.text()));
}
