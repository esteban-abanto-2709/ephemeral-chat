import { translations } from './i18n';

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
