import { TestBed } from '@angular/core/testing';
import { CopyLink } from './copy-link';

describe('CopyLink', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  async function render(labelled: boolean) {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const fixture = TestBed.createComponent(CopyLink);
    fixture.componentRef.setInput('link', 'https://chat.test/room/abc');
    fixture.componentRef.setInput('labelled', labelled);
    await fixture.whenStable();
    return { fixture, button: (fixture.nativeElement as HTMLElement).querySelector('button')! };
  }

  it('copies the link and says so', async () => {
    const { fixture, button } = await render(true);
    expect(button.textContent).toContain('Copy link');

    button.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith('https://chat.test/room/abc');
    expect(button.textContent).toContain('Copied');
  });

  it('names the icon-only button for screen readers', async () => {
    const { fixture, button } = await render(false);
    expect(button.getAttribute('aria-label')).toBe('Copy link');

    button.click();
    await fixture.whenStable();

    expect(button.getAttribute('aria-label')).toBe('Link copied');
  });
});
