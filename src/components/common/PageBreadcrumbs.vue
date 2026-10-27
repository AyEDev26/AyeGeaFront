<template>
  <nav
    v-if="items.length"
    class="page-breadcrumbs q-mb-md"
    :aria-label="t('layout.breadcrumb.ariaLabel')"
  >
    <!-- Escritorio: botón Volver + cadena completa -->
    <div class="gt-xs row items-center no-wrap">
      <q-btn
        flat
        round
        dense
        icon="arrow_back"
        class="page-breadcrumbs__back q-mr-sm"
        :to="parent.to"
        :aria-label="backAriaLabel"
      >
        <q-tooltip>{{ t('layout.back.tooltip') }}</q-tooltip>
      </q-btn>
      <q-breadcrumbs class="page-breadcrumbs__trail" gutter="xs">
        <template #separator>
          <q-icon name="chevron_right" size="16px" />
        </template>
        <q-breadcrumbs-el
          v-for="(item, index) in items"
          :key="index"
          :to="isLast(index) ? undefined : item.to"
          :icon="index === 0 ? 'home' : undefined"
          :label="t(item.label)"
          :aria-current="isLast(index) ? 'page' : undefined"
          :class="{ 'page-breadcrumbs__current': isLast(index) }"
        />
      </q-breadcrumbs>
    </div>

    <!-- Móvil: solo «← {padre}» -->
    <q-btn
      flat
      dense
      no-caps
      icon="arrow_back"
      class="lt-sm page-breadcrumbs__back"
      :to="parent.to"
      :label="t(parent.label)"
      :aria-label="backAriaLabel"
    />
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { BreadcrumbItem } from '@/router/routes';

const route = useRoute();
const { t } = useI18n();

interface TrailItem extends BreadcrumbItem {
  to?: string;
}

const HOME: TrailItem = { label: 'layout.nav.home', to: '/' };

// «Inicio» siempre es el primer nivel; sin meta.breadcrumb no se pinta nada.
const items = computed<TrailItem[]>(() => {
  const chain = route.meta.breadcrumb;
  return chain?.length ? [HOME, ...chain] : [];
});

const isLast = (index: number) => index === items.value.length - 1;

// Padre jerárquico fijo: último nivel con ruta antes de la pantalla actual.
const parent = computed<TrailItem>(() => {
  const previous = items.value.slice(0, -1);
  return [...previous].reverse().find((item) => item.to) ?? HOME;
});

const backAriaLabel = computed(() =>
  t('layout.back.ariaLabel', { destino: t(parent.value.label) }),
);
</script>

<style scoped>
.page-breadcrumbs {
  color: rgba(255, 255, 255, 0.85);
}

.page-breadcrumbs__back {
  color: #ffffff;
}

.page-breadcrumbs__trail {
  min-width: 0;
  flex-wrap: wrap;
}

.page-breadcrumbs :deep(.q-breadcrumbs__el) {
  color: rgba(255, 255, 255, 0.85);
}

.page-breadcrumbs :deep(.q-breadcrumbs__el:hover) {
  color: #ffffff;
}

.page-breadcrumbs :deep(.page-breadcrumbs__current) {
  color: #ffffff;
  font-weight: 600;
}

[data-theme='claro'] .page-breadcrumbs,
[data-theme='claro'] .page-breadcrumbs :deep(.q-breadcrumbs__el) {
  color: #475569;
}

[data-theme='claro'] .page-breadcrumbs__back,
[data-theme='claro'] .page-breadcrumbs :deep(.page-breadcrumbs__current),
[data-theme='claro'] .page-breadcrumbs :deep(.q-breadcrumbs__el:hover) {
  color: #0f766e;
}
</style>
