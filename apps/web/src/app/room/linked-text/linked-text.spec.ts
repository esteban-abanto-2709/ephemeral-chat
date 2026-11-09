import { TestBed } from '@angular/core/testing';
import { LinkedText, linkParts } from './linked-text';

describe('linkParts', () => {
  it('cuts a link out of the text around it', () => {
    expect(linkParts('Mira https://drive.google.com/file/d/abc?x=1#y ahora')).toEqual([
      { text: 'Mira ' },
      {
        text: 'https://drive.google.com/file/d/abc?x=1#y',
        href: 'https://drive.google.com/file/d/abc?x=1#y',
      },
      { text: ' ahora' },
    ]);
  });

  it('leaves punctuation after a link out of it', () => {
    expect(linkParts('See (https://example.com/a), ok.')).toEqual([
      { text: 'See (' },
      { text: 'https://example.com/a', href: 'https://example.com/a' },
      { text: '), ok.' },
    ]);
  });

  it('opens a bare domain over https', () => {
    expect(linkParts('example.com')).toEqual([
      { text: 'example.com', href: 'https://example.com' },
    ]);
  });

  it('only links the web', () => {
    for (const text of [
      'plain words',
      'me@example.com',
      'javascript:alert(1)',
      'ftp://example.com/file',
    ]) {
      expect(linkParts(text)).toEqual([{ text }]);
    }
  });

  it('keeps every character of the message', () => {
    const text = 'one\n  https://a.example/b  and   www.example.org\n';
    expect(
      linkParts(text)
        .map((part) => part.text)
        .join(''),
    ).toBe(text);
  });
});

describe('LinkedText', () => {
  async function render(text: string) {
    const fixture = TestBed.createComponent(LinkedText);
    fixture.componentRef.setInput('text', text);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('draws links that open apart and adds nothing to the text', async () => {
    const host = await render('a  https://example.com/x  b');
    const link = host.querySelector('a')!;

    expect(host.textContent).toBe('a  https://example.com/x  b');
    expect(link.getAttribute('href')).toBe('https://example.com/x');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('shows markup as text', async () => {
    const host = await render('<img src=x onerror=alert(1)> https://example.com');

    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('<img src=x');
  });

  it('keeps a tap on a link to itself', async () => {
    const host = await render('https://example.com');
    const outside = vi.fn();
    host.addEventListener('click', outside);
    host.querySelector('a')!.addEventListener('click', (event) => event.preventDefault());

    host.querySelector('a')!.click();

    expect(outside).not.toHaveBeenCalled();
  });
});
