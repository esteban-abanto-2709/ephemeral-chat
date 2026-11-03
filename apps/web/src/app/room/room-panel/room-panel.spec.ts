import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoomPanel } from './room-panel';

describe('RoomPanel', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  async function render() {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(RoomPanel);
    fixture.componentRef.setInput('link', 'https://chat.test/room/abc');
    fixture.componentRef.setInput('members', ['Juan', 'Luis']);
    fixture.componentRef.setInput('me', 'Juan');
    await fixture.whenStable();
    return { fixture, panel: fixture.nativeElement as HTMLElement };
  }

  it('shows the room link and copies it', async () => {
    const { fixture, panel } = await render();
    expect((panel.querySelector('#room-link') as HTMLInputElement).value).toBe(
      'https://chat.test/room/abc',
    );

    const copy = panel.querySelector('[aria-label="Copy link"]') as HTMLButtonElement;
    copy.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith('https://chat.test/room/abc');
    expect(copy.getAttribute('aria-label')).toBe('Link copied');
  });

  it('shows who is in the room and marks you', async () => {
    const { panel } = await render();

    expect(panel.querySelector('#members-title')?.textContent).toContain('In this room · 2');
    const members = [...panel.querySelectorAll('[aria-label="People in the room"] li')].map((li) =>
      [...li.children].map((part) => part.textContent?.trim()).join(' '),
    );
    expect(members).toEqual(['J Juan you', 'L Luis']);
  });
});
