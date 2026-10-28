<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t(`inventario.form.editTitle.${tipoKey}`) }}
        </div>
        <q-btn
          v-if="carpetaActiva !== 'informacion'"
          flat
          no-caps
          color="grey-7"
          icon="arrow_back"
          :label="t('inventario.carpetas.backToList')"
          @click="goToList"
        />
      </div>

      <q-tabs
        :model-value="carpetaActiva"
        dense
        no-caps
        align="left"
        active-color="teal-10"
        indicator-color="teal-7"
        class="text-grey-8 q-mb-md"
        outside-arrows
        mobile-arrows
        :aria-label="t('inventario.carpetas.ariaLabel')"
        @update:model-value="onSelectCarpeta"
      >
        <q-tab
          v-for="carpeta in carpetas"
          :key="carpeta.key"
          :name="carpeta.key"
          :icon="carpeta.icon"
          :label="t(`inventario.carpetas.${carpeta.key}`)"
        />
      </q-tabs>

      <q-tab-panels :model-value="carpetaActiva" keep-alive animated class="bg-transparent">
        <q-tab-panel
          v-for="carpeta in carpetas"
          :key="carpeta.key"
          :name="carpeta.key"
          class="q-pa-none"
        >
          <slot v-if="carpeta.kind === 'form'" name="informacion" :id="id" />
          <SkeletonCostesCard
            v-else-if="carpeta.kind === 'costes'"
            :labels="carpeta.labels ?? []"
          />
          <InventarioDocumentos v-else-if="carpeta.kind === 'documentos'" :id="id" />
          <SkeletonTablePlaceholder v-else :columns="carpeta.columns ?? []" />
        </q-tab-panel>
      </q-tab-panels>
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { TipoElemInventarioId } from '@/stores/elemsInventario';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import SkeletonTablePlaceholder from '@/components/inventario/SkeletonTablePlaceholder.vue';
import SkeletonCostesCard from '@/components/inventario/SkeletonCostesCard.vue';
import InventarioDocumentos from '@/components/inventario/InventarioDocumentos.vue';

type CarpetaKey =
  | 'informacion'
  | 'alertas'
  | 'tareas'
  | 'mantenimientos'
  | 'itvs'
  | 'revisiones'
  | 'costes'
  | 'documentos'
  | 'polizas'
  | 'rutas'
  | 'personas'
  | 'equipos'
  | 'manuales'
  | 'plantillas';

type CarpetaKind = 'form' | 'table' | 'costes' | 'documentos';

interface CarpetaConfig {
  key: CarpetaKey;
  kind: CarpetaKind;
  icon: string;
  columns?: string[];
  labels?: string[];
}

const props = defineProps<{
  tipoId: TipoElemInventarioId;
  id: number;
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const TIPO_KEYS = { 1: 'vehiculos', 2: 'maquinaria', 3: 'epis' } as const;
const tipoKey = computed(() => TIPO_KEYS[props.tipoId]);

const col = (...keys: string[]) => keys.map((k) => `inventario.carpetas.columns.${k}`);
const costesLabels = ['compra', 'mantenimiento', 'seguros', 'total'].map(
  (k) => `inventario.carpetas.costesLabels.${k}`,
);

const INFORMACION: CarpetaConfig = { key: 'informacion', kind: 'form', icon: 'info' };
const ALERTAS: CarpetaConfig = {
  key: 'alertas',
  kind: 'table',
  icon: 'notifications',
  columns: col('fecha', 'tipo', 'descripcion', 'prioridad', 'estado'),
};
const TAREAS: CarpetaConfig = {
  key: 'tareas',
  kind: 'table',
  icon: 'task_alt',
  columns: col('descripcion', 'responsable', 'vencimiento', 'prioridad', 'estado'),
};
const MANTENIMIENTOS: CarpetaConfig = {
  key: 'mantenimientos',
  kind: 'table',
  icon: 'build',
  columns: col('fecha', 'tipo', 'descripcion', 'importe', 'estado'),
};
const ITVS: CarpetaConfig = {
  key: 'itvs',
  kind: 'table',
  icon: 'fact_check',
  columns: col('fecha', 'resultado', 'proximaFecha', 'importe'),
};
const REVISIONES: CarpetaConfig = {
  key: 'revisiones',
  kind: 'table',
  icon: 'rule',
  columns: col('fecha', 'tipo', 'responsable', 'resultado', 'proximaFecha'),
};
const COSTES: CarpetaConfig = {
  key: 'costes',
  kind: 'costes',
  icon: 'euro',
  labels: costesLabels,
};
const DOCUMENTOS: CarpetaConfig = {
  key: 'documentos',
  kind: 'documentos',
  icon: 'description',
};
const POLIZAS: CarpetaConfig = {
  key: 'polizas',
  kind: 'table',
  icon: 'verified_user',
  columns: col('numero', 'aseguradora', 'vencimiento', 'importe', 'estado'),
};
const RUTAS: CarpetaConfig = {
  key: 'rutas',
  kind: 'table',
  icon: 'route',
  columns: col('fecha', 'origen', 'destino', 'kilometros', 'responsable'),
};
const PERSONAS: CarpetaConfig = {
  key: 'personas',
  kind: 'table',
  icon: 'group',
  columns: col('persona', 'rol', 'fecha', 'estado'),
};
const EQUIPOS: CarpetaConfig = {
  key: 'equipos',
  kind: 'table',
  icon: 'construction',
  columns: col('equipo', 'tipo', 'fecha', 'estado'),
};
const MANUALES: CarpetaConfig = {
  key: 'manuales',
  kind: 'table',
  icon: 'menu_book',
  columns: col('nombre', 'documento', 'version', 'fecha'),
};
const PLANTILLAS: CarpetaConfig = {
  key: 'plantillas',
  kind: 'table',
  icon: 'content_paste',
  columns: col('nombre', 'tipo', 'descripcion', 'fecha'),
};

const VEHICULO_MAQUINARIA: CarpetaConfig[] = [
  INFORMACION,
  ALERTAS,
  TAREAS,
  MANTENIMIENTOS,
  ITVS,
  REVISIONES,
  COSTES,
  DOCUMENTOS,
  POLIZAS,
  RUTAS,
  PERSONAS,
  EQUIPOS,
];

const CARPETAS: Record<TipoElemInventarioId, CarpetaConfig[]> = {
  1: VEHICULO_MAQUINARIA,
  2: VEHICULO_MAQUINARIA,
  3: [INFORMACION, TAREAS, REVISIONES, MANTENIMIENTOS, COSTES, DOCUMENTOS, MANUALES, PLANTILLAS],
};

const carpetas = computed(() => CARPETAS[props.tipoId]);

// Una clave ausente o inválida para este tipo cae en «Información».
const carpetaActiva = computed<CarpetaKey>(() => {
  const raw = route.query.carpeta;
  const key = Array.isArray(raw) ? raw[0] : raw;
  return carpetas.value.find((c) => c.key === key)?.key ?? 'informacion';
});

function onSelectCarpeta(key: CarpetaKey) {
  void router.replace({ query: { ...route.query, carpeta: key } });
}

function goToList() {
  void router.push(`/inventario/${tipoKey.value}`);
}
</script>
