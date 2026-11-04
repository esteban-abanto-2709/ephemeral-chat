import { DestroyRef, Directive, ElementRef, afterRenderEffect, computed, inject, input } from '@angular/core';
import { Theme } from '../theme/theme';
import { GlassName, GlassStyle, glassStyles } from './glass-styles';
import { LiquidGlass } from './liquid-glass';

const mix = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${Math.round(Math.min(amount, 1) * 100)}%, transparent)`;

@Directive({
  selector: '[appGlass]',
  host: {
    '[class.glass]': "style().kind === 'liquid'",
    '[class.frost]': "style().kind === 'frosted'",
    '[style.--glass-fill]': 'fill()',
    '[style.--glass-fallback]': 'fallback()',
    '[style.--glass-border]': 'border()',
    '[style.--glass-blur]': 'blur()',
    '[style.--glass-saturate]': 'saturate()',
  },
})
export class Glass {
  readonly appGlass = input<GlassName | ''>('');

  private readonly theme = inject(Theme);
  protected readonly style = computed<GlassStyle>(() => glassStyles[this.appGlass() || 'panel']);

  private readonly base = computed(() => {
    const style = this.style();
    return style.accent ? 'var(--accent)' : style.kind === 'liquid' ? 'var(--glass-base)' : 'var(--frost-base)';
  });
  private readonly amount = computed(() => {
    const style = this.style();
    return (style.kind === 'liquid' ? style.tint : style.fill)[this.theme.mode()];
  });
  protected readonly fill = computed(() => mix(this.base(), this.amount()));
  protected readonly fallback = computed(() =>
    mix(this.base(), this.style().kind === 'liquid' ? this.amount() + 0.2 : this.amount()),
  );
  protected readonly border = computed(() => mix('var(--frost-base)', this.style().border[this.theme.mode()]));
  protected readonly blur = computed(() => {
    const style = this.style();
    return style.kind === 'liquid' ? '24px' : `${style.blur}px`;
  });
  protected readonly saturate = computed(() => {
    const style = this.style();
    return style.kind === 'liquid' ? '160%' : `${style.saturation}%`;
  });

  constructor() {
    const lenses = inject(LiquidGlass);
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterRenderEffect(() => {
      const style = this.style();
      if (style.kind === 'liquid') {
        lenses.add(element, [style.blur, style.refraction, style.edge, style.light]);
      } else {
        lenses.delete(element);
      }
    });
    inject(DestroyRef).onDestroy(() => lenses.delete(element));
  }
}
