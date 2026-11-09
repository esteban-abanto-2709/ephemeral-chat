import { TestBed } from '@angular/core/testing';
import { QrDialog, qrPath } from './qr-dialog';

describe('qrPath', () => {
  it('draws a square code with its quiet zone', () => {
    const { size, path } = qrPath('https://example.com/chat/abc');

    expect(size).toBeGreaterThanOrEqual(29);
    expect(path).toContain('M4 4h1v1h-1z');
    expect(path).not.toContain('M0 0h1');
  });

  it('changes with the link', () => {
    expect(qrPath('https://example.com/a').path).not.toBe(qrPath('https://example.com/b').path);
  });
});

describe('QrDialog', () => {
  async function render(kind: 'private' | 'group') {
    const fixture = TestBed.createComponent(QrDialog);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('title', 'Weekend trip');
    fixture.componentRef.setInput('url', 'https://example.com/x');
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    return { dialog, closed };
  }

  it('says who a personal code reaches', async () => {
    const { dialog } = await render('private');

    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toContain('Your private QR');
    expect(dialog.textContent).toContain('message you privately');
    expect(dialog.textContent).toContain('Shows up in your chats');
  });

  it('names the group a group code opens', async () => {
    const { dialog } = await render('group');

    expect(dialog.querySelector('h2')?.textContent).toContain('Weekend trip');
    expect(dialog.textContent).toContain('joins this group');
    expect(dialog.textContent).not.toContain('Shows up in your chats');
  });

  it('closes with the X, a click outside the card and Escape', async () => {
    const { dialog, closed } = await render('private');
    dialog.querySelector<HTMLElement>('[aria-label="Close"]')!.click();
    expect(closed).toHaveBeenCalledTimes(1);

    dialog.open = true;
    dialog.click();
    expect(closed).toHaveBeenCalledTimes(2);

    dialog.open = true;
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    dialog.dispatchEvent(escape);
    expect(closed).toHaveBeenCalledTimes(3);
    expect(escape.defaultPrevented).toBe(true);
  });

  it('stays open on a click inside the card', async () => {
    const { dialog, closed } = await render('private');

    dialog.querySelector<HTMLElement>('h2')!.click();

    expect(dialog.open).toBe(true);
    expect(closed).not.toHaveBeenCalled();
  });
});
