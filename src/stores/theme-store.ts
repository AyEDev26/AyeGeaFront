import { defineStore } from 'pinia';
import { ref } from 'vue';

export type VisualTheme = 'classic' | 'claro';

export const THEME_STORAGE_KEY = 'hac-visual-theme';

function readStoredTheme(): VisualTheme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'claro' ? 'claro' : 'classic';
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<VisualTheme>(readStoredTheme());

  function setTheme(newTheme: VisualTheme) {
    theme.value = newTheme;
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }

  return {
    theme,
    setTheme,
  };
});
