import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CopyLink, CopyNotice } from './copy-link';

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
    const notice = TestBed.inject(CopyNotice);
    expect(notice.visible()).toBe(false);

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith('https://chat.test/room/abc');
    expect(notice.visible()).toBe(true);
  });
});
