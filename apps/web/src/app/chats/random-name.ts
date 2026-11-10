import { Language, translations } from '../i18n/i18n';

export function randomName(lang: Language, random: () => number = Math.random): string {
  const { nouns, adjectives } = translations[lang].names;
  const noun = nouns[Math.floor(random() * nouns.length)];
  const adjective = adjectives[Math.floor(random() * adjectives.length)];
  return lang === 'es' ? `${noun} ${adjective}` : `${adjective} ${noun}`;
}
