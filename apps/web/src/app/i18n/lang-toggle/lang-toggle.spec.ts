import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoPipe } from '@jsverse/transloco';
import { LangToggle } from './lang-toggle';

@Component({
  imports: [LangToggle, TranslocoPipe],
  template: `<app-lang-toggle />
    <p>{{ 'welcome.title' | transloco }}</p>`,
})
class Host {}

describe('LangToggle', () => {
  it('switches the whole page and remembers the choice', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const button = page.querySelector('button')!;
    expect(button.textContent?.trim()).toBe('en');
    expect(page.querySelector('p')?.textContent).toBe('Talk, then let it go');

    button.click();
    await fixture.whenStable();

    expect(button.textContent?.trim()).toBe('es');
    expect(button.getAttribute('aria-label')).toBe('Idioma: ES. Cambiar a inglés');
    expect(page.querySelector('p')?.textContent).toBe('Habla y déjalo ir');
    expect(document.documentElement.lang).toBe('es');
    expect(localStorage.getItem('lang')).toBe('es');
  });
});
