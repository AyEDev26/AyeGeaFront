import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Quasar } from 'quasar';
import { i18n, LOCALE_STORAGE_KEY, quasarLangPacks, type AppLocale } from '@/boot/i18n';

export const useLocaleStore = defineStore('locale', () => {
  const current = ref<AppLocale>(i18n.global.locale.value);

  function setLocale(locale: AppLocale) {
    current.value = locale;
    i18n.global.locale.value = locale;
    Quasar.lang.set(quasarLangPacks[locale]);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }

  return {
    current,
    setLocale,
  };
});
