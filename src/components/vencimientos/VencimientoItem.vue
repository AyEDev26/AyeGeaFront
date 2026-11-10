<template>
  <q-item v-if="$q.screen.xs" class="vencimiento-card column q-pa-md">
    <div class="row items-center justify-between no-wrap q-mb-xs">
      <q-chip
        dense
        square
        class="q-ma-none"
        color="blue-grey-1"
        text-color="blue-grey-9"
        :icon="TIPO_ICON[v.tipo]"
        :label="t(`vencimientos.tipo.${v.tipo}`)"
      />
      <q-chip
        dense
        class="q-ma-none"
        :color="URGENCIA_META[v.urgencia].chipBg"
        :text-color="URGENCIA_META[v.urgencia].chipText"
        :icon="URGENCIA_META[v.urgencia].icon"
        :label="t(`vencimientos.status.${v.urgencia}`)"
      />
    </div>
    <div class="text-weight-medium">{{ v.elemNombre }}</div>
    <div v-if="v.titulo" class="text-caption text-blue-grey-8">{{ v.titulo }}</div>
    <div class="text-body2 q-mt-xs">
      {{ formatDate(v.fecha) }} ·
      <span class="text-blue-grey-8">{{ relativeText(v.diasRestantes) }}</span>
    </div>
    <div class="row no-wrap items-center justify-end q-mt-xs">
      <template v-if="canEdit">
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          color="positive"
          icon="check_circle"
          :label="t('vencimientos.actions.realizarShort')"
          @click="emit('realizar', v)"
        />
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          color="negative"
          icon="cancel"
          :label="t('vencimientos.actions.cancelar')"
          @click="emit('cancelar', v)"
        />
      </template>
      <q-btn
        v-if="canOpenDetail"
        flat
        dense
        no-caps
        size="sm"
        color="primary"
        icon="open_in_new"
        :loading="detailLoading"
        :label="t('vencimientos.actions.detalleShort')"
        @click="emit('detalle', v)"
      />
    </div>
  </q-item>
  <q-item v-else>
    <q-item-section side top>
      <q-chip
        dense
        square
        color="blue-grey-1"
        text-color="blue-grey-9"
        :icon="TIPO_ICON[v.tipo]"
        :label="t(`vencimientos.tipo.${v.tipo}`)"
      />
    </q-item-section>
    <q-item-section>
      <q-item-label class="text-weight-medium">{{ v.elemNombre }}</q-item-label>
      <q-item-label v-if="v.titulo" caption>{{ v.titulo }}</q-item-label>
    </q-item-section>
    <q-item-section side class="text-right">
      <q-item-label>{{ formatDate(v.fecha) }}</q-item-label>
      <q-item-label caption>{{ relativeText(v.diasRestantes) }}</q-item-label>
    </q-item-section>
    <q-item-section side>
      <q-chip
        dense
        :color="URGENCIA_META[v.urgencia].chipBg"
        :text-color="URGENCIA_META[v.urgencia].chipText"
        :icon="URGENCIA_META[v.urgencia].icon"
        :label="t(`vencimientos.status.${v.urgencia}`)"
      />
    </q-item-section>
    <q-item-section side>
      <div class="row no-wrap items-center">
        <template v-if="canEdit">
          <q-btn
            flat
            round
            dense
            size="sm"
            color="positive"
            icon="check_circle"
            :aria-label="t('vencimientos.actions.realizar')"
            @click="emit('realizar', v)"
          >
            <q-tooltip>{{ t('vencimientos.actions.realizar') }}</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            size="sm"
            color="negative"
            icon="cancel"
            :aria-label="t('vencimientos.actions.cancelar')"
            @click="emit('cancelar', v)"
          >
            <q-tooltip>{{ t('vencimientos.actions.cancelar') }}</q-tooltip>
          </q-btn>
        </template>
        <q-btn
          v-if="canOpenDetail"
          flat
          round
          dense
          size="sm"
          color="primary"
          icon="open_in_new"
          :loading="detailLoading"
          :aria-label="t('vencimientos.actions.detalle')"
          @click="emit('detalle', v)"
        >
          <q-tooltip>{{ t('vencimientos.actions.detalle') }}</q-tooltip>
        </q-btn>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { Vencimiento } from '@/stores/vencimientos';
import { TIPO_ICON, URGENCIA_META, useVencimientoFormat } from './vencimientos-ui';

defineProps<{
  v: Vencimiento;
  canEdit: boolean;
  canOpenDetail: boolean;
  detailLoading: boolean;
}>();

const emit = defineEmits<{
  realizar: [v: Vencimiento];
  cancelar: [v: Vencimiento];
  detalle: [v: Vencimiento];
}>();

const $q = useQuasar();
const { t } = useI18n();
const { formatDate, relativeText } = useVencimientoFormat();
</script>

<style scoped>
.vencimiento-card {
  align-items: stretch;
}
</style>
