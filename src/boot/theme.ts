import { defineBoot } from '#q-app';
import { THEME_STORAGE_KEY, type VisualTheme } from '@/stores/theme-store';

function resolveInitialTheme(): VisualTheme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'claro' ? 'claro' : 'classic';
}

document.documentElement.dataset.theme = resolveInitialTheme();

export default defineBoot(() => {
  // La preferencia de tema ya se aplicó arriba, antes del primer render.
});
