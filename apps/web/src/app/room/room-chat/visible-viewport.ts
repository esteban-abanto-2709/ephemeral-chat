import { DOCUMENT, DestroyRef, Directive, inject, signal } from '@angular/core';

@Directive({
  selector: '[appVisibleViewport]',
  host: {
    '[style.height.px]': 'height()',
    '[style.translate]': 'offset()',
  },
})
export class VisibleViewport {
  protected readonly height = signal<number | null>(null);
  protected readonly offset = signal<string | null>(null);

  constructor() {
    const viewport = inject(DOCUMENT).defaultView?.visualViewport;
    if (!viewport) {
      return;
    }
    const update = () => {
      const zoomed = viewport.scale > 1;
      this.height.set(zoomed ? null : viewport.height);
      this.offset.set(zoomed || !viewport.offsetTop ? null : `0 ${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    inject(DestroyRef).onDestroy(() => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    });
  }
}
