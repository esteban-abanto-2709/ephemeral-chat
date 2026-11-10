import { Language, languages, translations } from '../i18n/i18n';
import { nameMaxLength } from '../room/name-dialog/name-dialog';
import { randomName } from './random-name';

describe('randomName', () => {
  it.each(languages)('has 40 distinct words per list in %s', (lang: Language) => {
    const { nouns, adjectives } = translations[lang].names;
    expect(nouns).toHaveLength(40);
    expect(adjectives).toHaveLength(40);
    expect(new Set(nouns).size).toBe(40);
    expect(new Set(adjectives).size).toBe(40);
    expect(nouns.filter((word) => adjectives.includes(word))).toEqual([]);
  });

  it.each(languages)('fits the name limit for every pair in %s', (lang: Language) => {
    const { nouns, adjectives } = translations[lang].names;
    const longest =
      Math.max(...nouns.map((n) => n.length)) + Math.max(...adjectives.map((a) => a.length)) + 1;
    expect(longest).toBeLessThanOrEqual(nameMaxLength);
  });

  it('puts the adjective after the noun in Spanish and before it in English', () => {
    expect(randomName('es', () => 0)).toBe('Lobo Plateado');
    expect(randomName('en', () => 0)).toBe('Silver Wolf');
    expect(randomName('es', () => 0.999)).toBe('Forastero Invicto');
    expect(randomName('en', () => 0.999)).toBe('Black Ronin');
  });
});
