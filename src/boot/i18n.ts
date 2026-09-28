import { defineBoot } from '#q-app';
import { createI18n } from 'vue-i18n';
import langEs from 'quasar/lang/es';
import langEnUS from 'quasar/lang/en-US';
import messages from '@/i18n';

export type AppLocale = 'es' | 'en-US';

export const LOCALE_STORAGE_KEY = 'ayecore:locale';

export function toApiLocale(locale: AppLocale): 'es' | 'en' {
  return locale === 'en-US' ? 'en' : 'es';
}

export const quasarLangPacks: Record<AppLocale, typeof langEs> = {
  es: langEs,
  'en-US': langEnUS,
};

function resolveInitialLocale(): AppLocale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'es' || stored === 'en-US') {
    return stored;
  }

  return navigator.language?.startsWith('en') ? 'en-US' : 'es';
}

const initialLocale = resolveInitialLocale();

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'es',
  messages,
});

export default defineBoot(({ app }) => {
  app.use(i18n);
  const $q = app.config.globalProperties.$q as { lang: { set: (pack: unknown) => void } };
  $q.lang.set(quasarLangPacks[initialLocale]);
});
