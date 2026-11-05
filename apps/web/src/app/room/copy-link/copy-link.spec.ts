import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Notice } from '../../notice';
import { CopyLink } from './copy-link';

@Component({
  imports: [CopyLink],
  template: `<button appCopyLink="https://chat.test/room/abc" aria-label="Copy room link"></button>`,
})
class Host {}

describe('CopyLink', () => {
  it('copies the link and shows the notice', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const notice = TestBed.inject(Notice);
    expect(notice.text()).toBeNull();

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith('https://chat.test/room/abc');
    expect(notice.text()).toBe('Link copied');
  });
});
