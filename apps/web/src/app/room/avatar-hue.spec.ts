import { initials } from './avatar-hue';

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Trueno Solitario')).toBe('TS');
    expect(initials('silver wolf')).toBe('SW');
    expect(initials('  Esteban  Abanto  Ruiz ')).toBe('EA');
  });

  it('keeps one letter for one word', () => {
    expect(initials('Ana')).toBe('A');
    expect(initials('Ñandú')).toBe('Ñ');
  });
});
