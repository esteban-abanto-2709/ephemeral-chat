import { Component, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-design-device',
  host: { class: 'flex flex-col gap-2' },
  template: `
    <p class="text-xs text-ink-soft capitalize">{{ label() }}</p>
    <div
      class="relative overflow-hidden rounded-2xl border border-edge shadow-lift"
      [style.height.px]="height() * scale()"
    >
      <iframe
        class="absolute top-0 left-0 origin-top-left"
        [title]="label()"
        [src]="url()"
        [style.width.px]="width()"
        [style.height.px]="height()"
        [style.transform]="'scale(' + scale() + ')'"
      ></iframe>
    </div>
  `,
})
export class DesignDevice {
  readonly label = input.required<string>();
  readonly src = input.required<string>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();

  private readonly sanitizer = inject(DomSanitizer);
  private readonly available = signal(0);
  protected readonly url = computed(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.src()));
  protected readonly scale = computed(() => Math.min(1, this.available() / this.width()) || 1);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      new ResizeObserver(([entry]) => this.available.set(entry.contentRect.width)).observe(host);
    });
  }
}
