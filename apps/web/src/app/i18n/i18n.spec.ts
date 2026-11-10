import { preferredLanguage, translations } from './i18n';

function keys(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

describe('translations', () => {
  it('have the same keys in every language', () => {
    expect(keys(translations.es).sort()).toEqual(keys(translations.en).sort());
  });
});

describe('preferredLanguage', () => {
  it('follows the first language the browser asks for that we have', () => {
    expect(preferredLanguage(null, ['es-PE', 'en'])).toBe('es');
    expect(preferredLanguage(null, ['fr-FR', 'es-MX'])).toBe('es');
    expect(preferredLanguage(null, ['en-US', 'es'])).toBe('en');
  });

  it('falls back to English', () => {
    expect(preferredLanguage(null, ['fr-FR'])).toBe('en');
    expect(preferredLanguage(null, [])).toBe('en');
  });

  it('keeps the language you picked over the browser', () => {
    expect(preferredLanguage('en', ['es-PE'])).toBe('en');
    expect(preferredLanguage('fr', ['es-PE'])).toBe('es');
  });
});
