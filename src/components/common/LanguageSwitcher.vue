<template>
  <q-btn
    unelevated
    no-caps
    class="language-switcher-btn"
    :ripple="false"
  >
    <span class="lang-flag">{{ currentOption.flag }}</span>
    <span class="lang-label">{{ currentOption.label }}</span>
    <q-icon name="expand_more" size="20px" class="lang-caret" />

    <q-menu
      anchor="bottom right"
      self="top right"
      class="language-switcher-menu"
      transition-show="jump-down"
      transition-hide="jump-up"
    >
      <q-list class="language-switcher-list">
        <q-item
          v-for="option in options"
          :key="option.value"
          clickable
          v-close-popup
          :active="option.value === current"
          active-class="language-switcher-item--active"
          class="language-switcher-item"
          @click="current = option.value"
        >
          <q-item-section avatar class="lang-flag-section">
            <span class="lang-flag">{{ option.flag }}</span>
          </q-item-section>
          <q-item-section>{{ option.label }}</q-item-section>
          <q-item-section v-if="option.value === current" side class="lang-check">
            <q-icon name="check" size="16px" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import type { AppLocale } from '@/boot/i18n';

interface LocaleOption {
  value: AppLocale;
  label: string;
  flag: string;
}

const options: LocaleOption[] = [
  { value: 'en-US', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
];

const localeStore = useLocaleStore();

const current = computed<AppLocale>({
  get: () => localeStore.current,
  set: (value) => localeStore.setLocale(value),
});

const currentOption = computed<LocaleOption>(
  () => options.find((option) => option.value === current.value) ?? options[0]!,
);
</script>

<style scoped>
.language-switcher-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 20;
  border-radius: 8px;
  background: #e4e7ec;
  color: #263238;
  padding: 6px 10px 6px 8px;
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.lang-flag {
  font-size: 1.1rem;
  line-height: 1;
  margin-right: 6px;
}

.lang-label {
  margin-right: 2px;
}

.lang-caret {
  color: #546e7a;
}
</style>

<style>
.language-switcher-menu {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.language-switcher-list {
  min-width: 160px;
  padding: 4px 0;
}

.language-switcher-item .lang-flag {
  font-size: 1.05rem;
}

.language-switcher-item--active {
  color: #00695c;
  font-weight: 600;
}

.language-switcher-item--active .lang-check {
  color: #00695c;
}
</style>
