import { TestBed } from '@angular/core/testing';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  afterEach(() => {
    delete document.documentElement.dataset['theme'];
    localStorage.clear();
  });

  it('switches the theme and remembers it', async () => {
    document.documentElement.dataset['theme'] = 'light';
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector('[role="switch"]')!;
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    (toggle as HTMLElement).click();
    await fixture.whenStable();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('keeps frosted glass when WebGL is unavailable', async () => {
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();

    expect(document.documentElement.classList.contains('liquid')).toBe(false);
    expect(document.querySelector('canvas')).toBeNull();
  });
});
