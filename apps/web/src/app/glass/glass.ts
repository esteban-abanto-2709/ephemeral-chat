import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { LiquidGlass } from './liquid-glass';

@Directive({
  selector: '[appGlass]',
  host: { class: 'glass' },
})
export class Glass {
  constructor() {
    const lenses = inject(LiquidGlass);
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => lenses.add(element));
    inject(DestroyRef).onDestroy(() => lenses.delete(element));
  }
}
