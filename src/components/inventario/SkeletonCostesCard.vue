<template>
  <div>
    <GlassCard class="q-pa-md">
      <div class="row q-col-gutter-md">
        <div v-for="label in labels" :key="label" class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey-7">{{ t(label) }}</div>
          <q-skeleton animation="none" type="text" height="2rem" width="60%" />
        </div>
      </div>
    </GlassCard>

    <div class="column items-center q-mt-md text-center">
      <q-chip dense square color="teal-1" text-color="teal-10" icon="schedule">
        {{ t('inventario.carpetas.comingSoon') }}
      </q-chip>
      <div class="text-caption text-grey-7">
        {{ t('inventario.carpetas.comingSoonHint') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import GlassCard from '@/components/common/GlassCard.vue';

defineProps<{
  /** Claves i18n de las etiquetas de la card. */
  labels: string[];
}>();

const { t } = useI18n();
</script>
