import { Injectable, Service, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoLoader, TranslocoService, provideTransloco } from '@jsverse/transloco';
import { forkJoin, of } from 'rxjs';
import en from './en.json';
import es from './es.json';

export const translations = { en, es };
export type Language = keyof typeof translations;
export const languages = Object.keys(translations) as Language[];

@Injectable()
class BundledLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(translations[lang as Language]);
  }
}

export function provideI18n() {
  return [
    provideTransloco({
      config: {
        availableLangs: languages,
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: BundledLoader,
    }),
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      return forkJoin(languages.map((lang) => transloco.load(lang)));
    }),
  ];
}

@Service()
export class I18n {
  private readonly transloco = inject(TranslocoService);
  readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  t(key: string, params?: Record<string, unknown>): string {
    this.lang();
    return this.transloco.translate(key, params);
  }

  use(lang: Language): void {
    this.transloco.setActiveLang(lang);
  }
}
