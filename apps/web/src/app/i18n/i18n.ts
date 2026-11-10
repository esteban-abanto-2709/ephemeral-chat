import {
  DOCUMENT,
  Injectable,
  Service,
  inject,
  isDevMode,
  provideAppInitializer,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoLoader, TranslocoService, provideTransloco } from '@jsverse/transloco';
import { Observable, forkJoin, of } from 'rxjs';
import en from './en.json';
import es from './es.json';

export const translations = { en, es };
export type Language = keyof typeof translations;
export const languages = Object.keys(translations) as Language[];
const storageKey = 'lang';

function isLanguage(value: string | null | undefined): value is Language {
  return languages.includes(value as Language);
}

export function preferredLanguage(saved: string | null, browser: readonly string[]): Language {
  if (isLanguage(saved)) {
    return saved;
  }
  return browser.map((tag) => tag.slice(0, 2).toLowerCase()).find(isLanguage) ?? 'en';
}

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
      inject(I18n).start();
      return forkJoin(languages.map((lang) => transloco.load(lang)));
    }),
  ];
}

@Service()
export class I18n {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  readonly lang = toSignal(this.transloco.langChanges$ as Observable<Language>, {
    initialValue: this.transloco.getActiveLang() as Language,
  });

  start(): void {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch {}
    this.use(preferredLanguage(saved, this.document.defaultView?.navigator.languages ?? []));
  }

  t(key: string, params?: Record<string, unknown>): string {
    this.lang();
    return this.transloco.translate(key, params);
  }

  use(lang: Language): void {
    this.transloco.setActiveLang(lang);
    this.document.documentElement.lang = lang;
  }

  toggle(): void {
    const lang = this.lang() === 'es' ? 'en' : 'es';
    this.use(lang);
    try {
      localStorage.setItem(storageKey, lang);
    } catch {}
  }
}
