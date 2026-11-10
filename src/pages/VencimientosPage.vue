<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-xs">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('vencimientos.title') }}
        </div>
        <div class="row items-center q-gutter-x-sm">
          <q-btn
            flat
            no-caps
            color="primary"
            icon="tune"
            :label="t('vencimientos.umbrales.button')"
            @click="umbralesVisible = true"
          />
          <q-btn
            flat
            no-caps
            color="primary"
            icon="refresh"
            :label="t('vencimientos.reload')"
            :disable="store.loading"
            @click="store.fetchVencimientos()"
          />
        </div>
      </div>
      <div class="text-body2 text-blue-grey-7 q-mb-md">{{ t('vencimientos.subtitle') }}</div>

      <div class="row q-col-gutter-md q-mb-lg">
        <div v-for="u in URGENCIAS" :key="u" class="col-12 col-sm-4">
          <q-card
            flat
            bordered
            class="kpi-card cursor-pointer"
            :class="[`kpi-card--${u}`, { 'kpi-card--active': urgenciaFilter === u }]"
            role="button"
            tabindex="0"
            :aria-pressed="urgenciaFilter === u"
            @click="toggleUrgencia(u)"
            @keydown.enter.prevent="toggleUrgencia(u)"
            @keydown.space.prevent="toggleUrgencia(u)"
          >
            <q-card-section class="row items-center no-wrap q-gutter-x-md">
              <q-icon :name="URGENCIA_META[u].icon" :color="URGENCIA_META[u].color" size="32px" />
              <div>
                <div class="text-h4 text-weight-bold font-outfit">{{ counts[u] }}</div>
                <div class="text-body2 text-blue-grey-8">{{ t(`vencimientos.kpi.${u}`) }}</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mb-md items-center">
        <div class="col-12 col-md-4">
          <q-select
            v-model="tipoFilter"
            outlined
            dense
            multiple
            use-chips
            clearable
            emit-value
            map-options
            class="elegant-input"
            :label="t('vencimientos.filters.tipo')"
            :options="tipoOptions"
          />
        </div>
        <div class="col-12 col-md-4">
          <q-select
            v-model="elemFilter"
            outlined
            dense
            clearable
            use-input
            input-debounce="0"
            emit-value
            map-options
            class="elegant-input"
            :label="t('vencimientos.filters.activo')"
            :options="elemOptionsFiltered"
            @filter="onElemFilter"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">{{
                  t('vencimientos.filters.noOptions')
                }}</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div v-if="hasActiveFilters" class="col-12 col-md-auto">
          <q-btn
            flat
            no-caps
            color="grey-8"
            icon="filter_alt_off"
            :label="t('vencimientos.filters.clear')"
            @click="clearFilters"
          />
        </div>
      </div>

      <q-banner
        v-if="store.truncados.length"
        rounded
        dense
        class="bg-amber-1 text-amber-10 q-mb-md"
        role="status"
      >
        <template #avatar>
          <q-icon name="warning" color="amber-9" />
        </template>
        <div v-for="tr in store.truncados" :key="tr.tipo">
          {{
            t('vencimientos.truncated', {
              n: tr.mostrados,
              total: tr.total,
              tipo: t(`vencimientos.tipoPlural.${tr.tipo}`),
            })
          }}
        </div>
      </q-banner>

      <q-tabs
        v-model="tab"
        dense
        align="left"
        class="text-teal-10 q-mb-md"
        active-color="teal-9"
        indicator-color="teal-9"
        no-caps
      >
        <q-tab name="lista" icon="format_list_bulleted" :label="t('vencimientos.tabs.lista')" />
        <q-tab name="activo" icon="directions_car" :label="t('vencimientos.tabs.activo')" />
        <q-tab name="calendario" icon="calendar_month" :label="t('vencimientos.tabs.calendario')" />
      </q-tabs>

      <div v-if="store.loading && !store.loaded" class="row justify-center q-pa-xl">
        <q-spinner color="primary" size="40px" :aria-label="t('vencimientos.loading')" />
      </div>

      <q-banner v-else-if="store.error" rounded class="bg-red-1 text-red-10">
        {{ t('vencimientos.fetchError') }}
        <template #action>
          <q-btn flat no-caps color="red-10" :label="t('vencimientos.retry')" @click="load" />
        </template>
      </q-banner>

      <div v-else-if="!store.items.length" class="text-center text-blue-grey-6 q-pa-xl">
        <q-icon name="event_available" size="48px" class="q-mb-sm" />
        <div class="text-subtitle1">{{ t('vencimientos.empty') }}</div>
      </div>

      <div v-else-if="!visible.length" class="text-center text-blue-grey-6 q-pa-xl">
        <q-icon name="search_off" size="48px" class="q-mb-sm" />
        <div class="text-subtitle1">{{ t('vencimientos.noResults') }}</div>
      </div>

      <template v-else>
        <div v-show="tab === 'lista'">
          <section v-for="u in URGENCIAS" v-show="grouped[u].length" :key="u" class="q-mb-lg">
            <div class="row items-center q-gutter-x-sm q-mb-sm">
              <q-icon :name="URGENCIA_META[u].icon" :color="URGENCIA_META[u].color" size="sm" />
              <h2 class="text-h6 text-weight-bold font-outfit q-ma-none">
                {{ t(`vencimientos.sections.${u}`) }}
              </h2>
              <q-badge :color="URGENCIA_META[u].color" :label="grouped[u].length" />
            </div>

            <q-list bordered separator class="rounded-borders bg-white">
              <VencimientoItem
                v-for="v in grouped[u]"
                :key="rowKey(v)"
                :v="v"
                :can-edit="canEdit"
                :can-open-detail="canOpenDetail"
                :detail-loading="detailLoadingKey === rowKey(v)"
                @realizar="openRealizar"
                @cancelar="openCancelar"
                @detalle="openDetalle"
              />
            </q-list>
          </section>
        </div>

        <VencimientosCalendar
          v-if="tab === 'calendario'"
          :items="visible"
          :can-edit="canEdit"
          :can-open-detail="canOpenDetail"
          :detail-loading-key="detailLoadingKey"
          @realizar="openRealizar"
          @cancelar="openCancelar"
          @detalle="openDetalle"
        />

        <div v-if="tab === 'activo'" class="row q-col-gutter-md">
          <div v-for="g in porActivo" :key="g.elemInventarioId" class="col-12 col-md-6">
            <q-card flat bordered class="full-height">
              <q-card-section class="row items-center no-wrap q-pb-sm">
                <div class="col">
                  <div class="text-subtitle1 text-weight-bold ellipsis">{{ g.elemNombre }}</div>
                  <div class="row q-gutter-xs q-mt-xs">
                    <q-badge
                      v-for="u in URGENCIAS"
                      v-show="g.counts[u]"
                      :key="u"
                      :color="URGENCIA_META[u].chipBg"
                      :text-color="URGENCIA_META[u].chipText"
                      class="q-pa-xs"
                    >
                      <q-icon :name="URGENCIA_META[u].icon" size="14px" class="q-mr-xs" />
                      {{ g.counts[u] }} {{ t(`vencimientos.status.${u}`) }}
                    </q-badge>
                  </div>
                </div>
                <q-btn
                  v-if="canOpenDetail"
                  flat
                  round
                  dense
                  color="primary"
                  icon="open_in_new"
                  :loading="detailLoadingKey === `elem-${g.elemInventarioId}`"
                  :aria-label="t('vencimientos.actions.detalle')"
                  @click="openFicha(g.elemInventarioId, `elem-${g.elemInventarioId}`)"
                >
                  <q-tooltip>{{ t('vencimientos.actions.detalle') }}</q-tooltip>
                </q-btn>
              </q-card-section>
              <q-separator />
              <q-list separator dense>
                <q-item v-for="v in g.items" :key="rowKey(v)">
                  <q-item-section avatar>
                    <q-icon :name="TIPO_ICON[v.tipo]" color="blue-grey-7">
                      <q-tooltip>{{ t(`vencimientos.tipo.${v.tipo}`) }}</q-tooltip>
                    </q-icon>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>
                      {{ t(`vencimientos.tipo.${v.tipo}`)
                      }}<template v-if="v.titulo && v.tipo !== 'itv'"> · {{ v.titulo }}</template>
                    </q-item-label>
                    <q-item-label caption>
                      {{ formatDate(v.fecha) }} · {{ relativeText(v.diasRestantes) }}
                    </q-item-label>
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
                </q-item>
              </q-list>
            </q-card>
          </div>
        </div>
      </template>
    </GlassCard>

    <VencimientosUmbralesDialog v-model="umbralesVisible" />
    <RevisionRealizarDialog
      v-if="actionRevision"
      v-model="realizarVisible"
      :revision="actionRevision"
      @saved="load"
    />
    <RevisionCancelarDialog
      v-if="actionRevision"
      v-model="cancelarVisible"
      :revision="actionRevision"
      @saved="load"
    />
    <MantenimientoRealizarDialog
      v-if="actionMantenimiento"
      v-model="realizarVisible"
      :mantenimiento="actionMantenimiento"
      @saved="load"
    />
    <MantenimientoCancelarDialog
      v-if="actionMantenimiento"
      v-model="cancelarVisible"
      :mantenimiento="actionMantenimiento"
      @saved="load"
    />
    <ItvRealizarDialog v-if="actionItv" v-model="realizarVisible" :itv="actionItv" @saved="load" />
    <ItvCancelarDialog v-if="actionItv" v-model="cancelarVisible" :itv="actionItv" @saved="load" />
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import RevisionRealizarDialog from '@/components/inventario/RevisionRealizarDialog.vue';
import RevisionCancelarDialog from '@/components/inventario/RevisionCancelarDialog.vue';
import MantenimientoRealizarDialog from '@/components/inventario/MantenimientoRealizarDialog.vue';
import MantenimientoCancelarDialog from '@/components/inventario/MantenimientoCancelarDialog.vue';
import ItvRealizarDialog from '@/components/inventario/ItvRealizarDialog.vue';
import ItvCancelarDialog from '@/components/inventario/ItvCancelarDialog.vue';
import VencimientoItem from '@/components/vencimientos/VencimientoItem.vue';
import VencimientosCalendar from '@/components/vencimientos/VencimientosCalendar.vue';
import {
  rowKey,
  TIPO_ICON,
  URGENCIAS,
  URGENCIA_META,
  useVencimientoFormat,
} from '@/components/vencimientos/vencimientos-ui';
import VencimientosUmbralesDialog from '@/components/vencimientos/VencimientosUmbralesDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useElemsInventarioStore, type TipoElemInventarioId } from '@/stores/elemsInventario';
import type { Revision } from '@/stores/revisiones';
import type { Mantenimiento } from '@/stores/mantenimientos';
import type { Itv } from '@/stores/itvs';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import {
  useVencimientosStore,
  type VencimientoTipo,
  type VencimientoUrgencia,
  type Vencimiento,
  VENCIMIENTO_TIPOS,
} from '@/stores/vencimientos';

const { t, locale } = useI18n();
const { formatDate, relativeText } = useVencimientoFormat();
const store = useVencimientosStore();
const router = useRouter();
const $q = useQuasar();
const auth = useAuthStore();
const elemsStore = useElemsInventarioStore();

const umbralesVisible = ref(false);
const canEdit = computed(() => auth.hasPermission('mantenimiento_revisiones.editar'));
// «Detalle» abre la ruta de edición del elemento, que exige este permiso.
const canOpenDetail = computed(() => auth.hasPermission('elementos_inventario.editar'));

// Filtros combinables: tipo + activo (afectan a los contadores) y tarjeta (solo filtra la lista).
const tipoFilter = ref<VencimientoTipo[]>([]);
const elemFilter = ref<number | null>(null);
const urgenciaFilter = ref<VencimientoUrgencia | null>(null);

const hasActiveFilters = computed(
  () => tipoFilter.value.length > 0 || elemFilter.value != null || urgenciaFilter.value != null,
);

const tipoOptions = computed(() =>
  VENCIMIENTO_TIPOS.map((tipo) => ({ value: tipo, label: t(`vencimientos.tipo.${tipo}`) })),
);

const elemOptions = computed(() => {
  const map = new Map<number, string>();
  for (const v of store.items) map.set(v.elemInventarioId, v.elemNombre);
  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, locale.value));
});
const elemSearch = ref('');
const elemOptionsFiltered = computed(() => {
  const q = elemSearch.value.trim().toLowerCase();
  return q ? elemOptions.value.filter((o) => o.label.toLowerCase().includes(q)) : elemOptions.value;
});
function onElemFilter(val: string, update: (fn: () => void) => void) {
  update(() => {
    elemSearch.value = val;
  });
}

// Base para los contadores: tipo + activo, sin el filtro de tarjeta.
const baseItems = computed(() =>
  store.items.filter(
    (v) =>
      (!tipoFilter.value.length || tipoFilter.value.includes(v.tipo)) &&
      (elemFilter.value == null || v.elemInventarioId === elemFilter.value),
  ),
);

const visible = computed(() =>
  urgenciaFilter.value
    ? baseItems.value.filter((v) => v.urgencia === urgenciaFilter.value)
    : baseItems.value,
);

const grouped = computed(() => {
  const result: Record<VencimientoUrgencia, Vencimiento[]> = {
    vencida: [],
    inminente: [],
    proxima: [],
  };
  for (const v of visible.value) result[v.urgencia].push(v); // items ya viene ordenado por fecha
  return result;
});

// Pestaña «Por activo»: parte de la lista visible, así que sus contadores suman los de la lista.
interface GrupoActivo {
  elemInventarioId: number;
  elemNombre: string;
  items: Vencimiento[];
  counts: Record<VencimientoUrgencia, number>;
}
const porActivo = computed<GrupoActivo[]>(() => {
  const map = new Map<number, GrupoActivo>();
  // visible ya viene ordenado por fecha: los activos con la tarea más urgente quedan primero.
  for (const v of visible.value) {
    let g = map.get(v.elemInventarioId);
    if (!g) {
      g = {
        elemInventarioId: v.elemInventarioId,
        elemNombre: v.elemNombre,
        items: [],
        counts: { vencida: 0, inminente: 0, proxima: 0 },
      };
      map.set(v.elemInventarioId, g);
    }
    g.items.push(v);
    g.counts[v.urgencia]++;
  }
  return [...map.values()];
});

const tab = ref<'lista' | 'activo' | 'calendario'>('lista');

const counts = computed(() => {
  const result: Record<VencimientoUrgencia, number> = { vencida: 0, inminente: 0, proxima: 0 };
  for (const v of baseItems.value) result[v.urgencia]++;
  return result;
});

function toggleUrgencia(u: VencimientoUrgencia) {
  urgenciaFilter.value = urgenciaFilter.value === u ? null : u;
}

function clearFilters() {
  tipoFilter.value = [];
  elemFilter.value = null;
  urgenciaFilter.value = null;
}

// ---- Acciones por fila ----
// Los diálogos de realizar/cancelar son los de las specs 38–40; cada uno solo se abre con su tipo.
const actionItem = ref<Vencimiento | null>(null);
const realizarVisible = ref(false);
const cancelarVisible = ref(false);
const actionRevision = computed(() =>
  actionItem.value?.tipo === 'revision' ? (actionItem.value.raw as Revision) : null,
);
const actionMantenimiento = computed(() =>
  actionItem.value?.tipo === 'mantenimiento' ? (actionItem.value.raw as Mantenimiento) : null,
);
const actionItv = computed(() =>
  actionItem.value?.tipo === 'itv' ? (actionItem.value.raw as Itv) : null,
);

function openRealizar(v: Vencimiento) {
  actionItem.value = v;
  realizarVisible.value = true;
}

function openCancelar(v: Vencimiento) {
  actionItem.value = v;
  cancelarVisible.value = true;
}

const TIPO_ELEM_SEGMENT: Record<TipoElemInventarioId, string> = {
  1: 'vehiculos',
  2: 'maquinaria',
  3: 'epis',
};
const CARPETA_BY_TIPO: Record<VencimientoTipo, string> = {
  revision: 'revisiones',
  mantenimiento: 'mantenimientos',
  itv: 'itvs',
};

const detailLoadingKey = ref<string | null>(null);

function openDetalle(v: Vencimiento) {
  return openFicha(v.elemInventarioId, rowKey(v), CARPETA_BY_TIPO[v.tipo]);
}

// El recurso solo trae { id, nombre } del elemento: el tipo se resuelve al pulsar.
// Sin `carpeta` se abre la carpeta «Información» por defecto.
async function openFicha(elemId: number, loadingKey: string, carpeta?: string) {
  if (detailLoadingKey.value) return;
  detailLoadingKey.value = loadingKey;
  try {
    const detail = await elemsStore.fetchElem(elemId);
    const segment = TIPO_ELEM_SEGMENT[detail.tipoElementoInventarioId as TipoElemInventarioId];
    if (!segment) throw new Error('tipo de elemento desconocido');
    await router.push({
      path: `/inventario/${segment}/${elemId}/editar`,
      ...(carpeta ? { query: { carpeta } } : {}),
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('vencimientos.actions.detalleError')),
    });
  } finally {
    detailLoadingKey.value = null;
  }
}

function load() {
  void store.fetchVencimientos();
}

onMounted(load);
</script>

<style scoped>
.kpi-card {
  border-left-width: 4px;
}
.kpi-card--active {
  outline: 2px solid currentColor;
  box-shadow: 0 2px 10px rgb(0 0 0 / 15%);
}
.kpi-card--vencida {
  border-left-color: var(--q-negative, #c62828);
}
.kpi-card--inminente {
  border-left-color: #ff8f00;
}
.kpi-card--proxima {
  border-left-color: #1976d2;
}
</style>
