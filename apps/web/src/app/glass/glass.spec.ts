import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Glass } from './glass';

@Component({
  imports: [Glass],
  template: `<div appGlass></div><p appGlass="bubble"></p>`,
})
class Host {}

describe('Glass', () => {
  it('styles each piece from its own configuration', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const [panel, bubble] = Array.from((fixture.nativeElement as HTMLElement).children) as HTMLElement[];

    expect(panel.classList).toContain('glass');
    expect(bubble.classList).toContain('frost');
    expect(bubble.style.getPropertyValue('--glass-blur')).toBe('6px');
  });
});
