<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ title }}
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mb-md items-start">
        <div class="col-6 col-md-auto inventario-filter">
          <q-input
            v-model="form.nombre"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('inventario.filters.nombreLabel')"
            @keyup.enter="onFilterClick"
          />
        </div>
        <div class="col-6 col-md-auto inventario-filter">
          <q-input
            v-model="form.referencia"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('inventario.filters.referenciaLabel')"
            @keyup.enter="onFilterClick"
          />
        </div>
        <div class="col-6 col-md-auto inventario-filter">
          <q-input
            v-model="form.nSerie"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('inventario.filters.nSerieLabel')"
            @keyup.enter="onFilterClick"
          />
        </div>
        <div v-if="tipoId === 1" class="col-6 col-md-auto inventario-filter">
          <q-input
            v-model="form.matricula"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('inventario.filters.matriculaLabel')"
            @keyup.enter="onFilterClick"
          />
        </div>
        <div class="col-6 col-md-auto inventario-filter">
          <q-select
            v-model="form.estadoId"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="elegant-input"
            :options="estadoOptions"
            :label="t('inventario.filters.estadoLabel')"
          />
        </div>
        <div class="col-6 col-md-auto inventario-filter">
          <q-select
            v-model="form.categoriaId"
            outlined
            dense
            clearable
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            emit-value
            map-options
            option-value="id"
            option-label="nombre"
            class="elegant-input"
            :options="categoriaSelect.shown.value"
            :label="t('inventario.filters.categoriaLabel')"
            @filter="categoriaSelect.onFilter"
            @update:model-value="form.subcategoriaId = null"
          />
        </div>
        <div class="col-6 col-md-auto inventario-filter">
          <q-select
            v-model="form.subcategoriaId"
            outlined
            dense
            clearable
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            emit-value
            map-options
            option-value="id"
            option-label="nombre"
            class="elegant-input"
            :options="subcategoriaSelect.shown.value"
            :label="t('inventario.filters.subcategoriaLabel')"
            @filter="subcategoriaSelect.onFilter"
          />
        </div>
        <div
          v-for="sel in simpleSelects"
          :key="sel.key"
          class="col-6 col-md-auto inventario-filter"
        >
          <q-select
            v-model="form[sel.key]"
            outlined
            dense
            clearable
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            emit-value
            map-options
            option-value="id"
            option-label="nombre"
            class="elegant-input"
            :options="sel.select.shown.value"
            :label="sel.label"
            @filter="sel.select.onFilter"
          />
        </div>
        <div class="col-12 col-md-auto row q-gutter-x-sm items-center">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="filter_alt"
            class="elegant-btn"
            :label="t('inventario.filters.filterButton')"
            @click="onFilterClick"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('inventario.filters.clearButton')"
            @click="onClearClick"
          />
        </div>
      </div>

      <q-table
        v-model:pagination="pagination"
        flat
        bordered
        dense
        class="elegant-table"
        :rows="sortedItems"
        :columns="columns"
        row-key="id"
        :rows-per-page-options="[10, 15, 25, 50]"
        :loading="state.loading"
        :no-data-label="t('inventario.empty')"
        @request="onRequest"
      >
        <template #body-cell-estado="props">
          <q-td :props="props">
            <q-chip
              dense
              square
              :color="props.row.estadoId === 1 ? 'green-7' : 'grey-6'"
              text-color="white"
            >
              {{
                props.row.estadoId === 1
                  ? t('inventario.estados.active')
                  : t('inventario.estados.inactive')
              }}
            </q-chip>
          </q-td>
        </template>
      </q-table>
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import {
  useElemsInventarioStore,
  type ElemInventario,
  type ElemsInventarioFilters,
  type TipoElemInventarioId,
} from '@/stores/elemsInventario';
import { useCategoriasStore } from '@/stores/categorias';
import { useSubcategoriasStore, type Subcategoria } from '@/stores/subcategorias';
import { useDelegacionesStore } from '@/stores/delegaciones';
import { useUbicacionesStore } from '@/stores/ubicaciones';
import { useDepartamentosStore } from '@/stores/departamentos';
import { useProveedoresStore } from '@/stores/proveedores';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  tipoId: TipoElemInventarioId;
  title: string;
}>();

const $q = useQuasar();
const { t, locale } = useI18n();
const elemsStore = useElemsInventarioStore();
const categoriasStore = useCategoriasStore();
const subcategoriasStore = useSubcategoriasStore();
const delegacionesStore = useDelegacionesStore();
const ubicacionesStore = useUbicacionesStore();
const departamentosStore = useDepartamentosStore();
const proveedoresStore = useProveedoresStore();

// Estado persistente de esta pantalla (página, filas por página, filtros aplicados).
const state = computed(() => elemsStore.byTipo[props.tipoId]);

interface FormState {
  nombre: string | null;
  referencia: string | null;
  nSerie: string | null;
  matricula: string | null;
  estadoId: 0 | 1 | null;
  categoriaId: number | null;
  subcategoriaId: number | null;
  delegacionId: number | null;
  ubicacionId: number | null;
  departamentoId: number | null;
  proveedorId: number | null;
}

type SimpleSelectKey = 'delegacionId' | 'ubicacionId' | 'departamentoId' | 'proveedorId';

function formFromFilters(f: ElemsInventarioFilters): FormState {
  return {
    nombre: f.nombre ?? '',
    referencia: f.referencia ?? '',
    nSerie: f.nSerie ?? '',
    matricula: f.matricula ?? '',
    estadoId: f.estadoId ?? null,
    categoriaId: f.categoriaId ?? null,
    subcategoriaId: f.subcategoriaId ?? null,
    delegacionId: f.delegacionId ?? null,
    ubicacionId: f.ubicacionId ?? null,
    departamentoId: f.departamentoId ?? null,
    proveedorId: f.proveedorId ?? null,
  };
}

const form = ref<FormState>(formFromFilters(state.value.filters));

// Última combinación de filtros aplicada (vía "Filtrar" o "Limpiar"). Se reutiliza en
// onRequest para que cambiar de página conserve el filtro activo.
const appliedFilters = ref<ElemsInventarioFilters>({ ...state.value.filters });

function buildFilters(): ElemsInventarioFilters {
  const f = form.value;
  return {
    ...(f.nombre ? { nombre: f.nombre } : {}),
    ...(f.referencia ? { referencia: f.referencia } : {}),
    ...(f.nSerie ? { nSerie: f.nSerie } : {}),
    ...(props.tipoId === 1 && f.matricula ? { matricula: f.matricula } : {}),
    ...(f.estadoId !== null ? { estadoId: f.estadoId } : {}),
    ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
    ...(f.subcategoriaId ? { subcategoriaId: f.subcategoriaId } : {}),
    ...(f.delegacionId ? { delegacionId: f.delegacionId } : {}),
    ...(f.ubicacionId ? { ubicacionId: f.ubicacionId } : {}),
    ...(f.departamentoId ? { departamentoId: f.departamentoId } : {}),
    ...(f.proveedorId ? { proveedorId: f.proveedorId } : {}),
  };
}

// --- Selects de filtro -------------------------------------------------------

interface NamedOption {
  id: number;
  nombre: string;
}

function createSelectOptions<T extends NamedOption>() {
  const all = ref<T[]>([]) as Ref<T[]>;
  const shown = ref<T[]>([]) as Ref<T[]>;
  function setAll(options: T[]) {
    all.value = options;
    shown.value = options;
  }
  function onFilter(val: string, update: (callback: () => void) => void) {
    update(() => {
      const needle = val.trim().toLowerCase();
      shown.value = needle
        ? all.value.filter((o) => o.nombre.toLowerCase().includes(needle))
        : all.value;
    });
  }
  return { all, shown, setAll, onFilter };
}

const categoriaSelect = createSelectOptions<NamedOption>();
const subcategoriaSelect = createSelectOptions<NamedOption>();
const delegacionSelect = createSelectOptions<NamedOption>();
const ubicacionSelect = createSelectOptions<NamedOption>();
const departamentoSelect = createSelectOptions<NamedOption>();
const proveedorSelect = createSelectOptions<NamedOption>();

const simpleSelects = computed<
  { key: SimpleSelectKey; label: string; select: ReturnType<typeof createSelectOptions> }[]
>(() => [
  {
    key: 'delegacionId',
    label: t('inventario.filters.delegacionLabel'),
    select: delegacionSelect,
  },
  {
    key: 'ubicacionId',
    label: t('inventario.filters.ubicacionLabel'),
    select: ubicacionSelect,
  },
  {
    key: 'departamentoId',
    label: t('inventario.filters.departamentoLabel'),
    select: departamentoSelect,
  },
  {
    key: 'proveedorId',
    label: t('inventario.filters.proveedorLabel'),
    select: proveedorSelect,
  },
]);

const estadoOptions = computed(() => [
  { label: t('inventario.estados.active'), value: 1 },
  { label: t('inventario.estados.inactive'), value: 0 },
]);

// Subcategorías del tipo; sin categoría elegida se muestran todas, con categoría solo las suyas.
const allSubcategorias = ref<Subcategoria[]>([]);
const subcategoriaOptions = computed(() =>
  form.value.categoriaId
    ? allSubcategorias.value.filter((s) => s.categoriaId === form.value.categoriaId)
    : allSubcategorias.value,
);
watch(subcategoriaOptions, (options) => {
  subcategoriaSelect.setAll(options);
});

// Un fallo de carga de un select (p. ej. 403 por permisos) deja su lista vacía con un aviso.
async function loadSelectOptions() {
  const results = await Promise.allSettled([
    categoriasStore.fetchAllCategorias(props.tipoId).then(categoriaSelect.setAll),
    subcategoriasStore
      .fetchAllSubcategorias({ tipoElementoInventarioId: props.tipoId })
      .then((subs) => {
        allSubcategorias.value = subs;
        subcategoriaSelect.setAll(subcategoriaOptions.value);
      }),
    delegacionesStore.fetchAllDelegaciones().then(delegacionSelect.setAll),
    ubicacionesStore.fetchAllUbicaciones().then(ubicacionSelect.setAll),
    departamentosStore.fetchAllDepartamentos().then(departamentoSelect.setAll),
    proveedoresStore.fetchAllProveedores().then(proveedorSelect.setAll),
  ]);
  if (results.some((r) => r.status === 'rejected')) {
    $q.notify({ type: 'warning', message: t('inventario.optionsError') });
  }
}

// --- Columnas ----------------------------------------------------------------

function formatNullable(val: string | number | null | undefined) {
  return val === null || val === undefined || val === '' ? '—' : String(val);
}

// Las fechas llegan como 'YYYY-MM-DD' (o ISO); se formatean según el idioma activo.
function formatDate(val: string | number | null | undefined) {
  if (!val) return '—';
  const text = String(val);
  const [y, m, d] = text.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return text;
  return new Date(y, m - 1, d).toLocaleDateString(locale.value);
}

function marcaModelo(marca: string | null | undefined, modelo: string | null | undefined) {
  return [marca, modelo].filter(Boolean).join(' ') || null;
}

const columns = computed<QTableColumn<ElemInventario>[]>(() => {
  const col = (
    name: string,
    field: (row: ElemInventario) => string | number | null | undefined,
    format: (val: string | number | null | undefined) => string = formatNullable,
  ): QTableColumn<ElemInventario> => ({
    name,
    label: t(`inventario.columns.${name}`),
    field,
    align: 'left',
    sortable: true,
    format,
  });

  const common = [
    col('referencia', (r) => r.referencia),
    col('nombre', (r) => r.nombre),
    col('categoria', (r) => r.categoria?.nombre),
    col('subcategoria', (r) => r.subcategoria?.nombre),
    col('delegacion', (r) => r.delegacion?.nombre),
    col('ubicacion', (r) => r.ubicacion?.nombre),
  ];
  const estado: QTableColumn<ElemInventario> = {
    name: 'estado',
    label: t('inventario.columns.estado'),
    field: (r) => r.estadoId,
    align: 'left',
    sortable: true,
  };

  if (props.tipoId === 1) {
    return [
      ...common,
      col('matricula', (r) => r.vehiculo?.matricula),
      col('marcaModelo', (r) => marcaModelo(r.vehiculo?.marca, r.vehiculo?.modelo)),
      col('proximaRevision', (r) => r.vehiculo?.proximaRevision, formatDate),
      estado,
    ];
  }
  if (props.tipoId === 2) {
    return [
      ...common,
      col('marcaModelo', (r) => marcaModelo(r.maquinaria?.marca, r.maquinaria?.modelo)),
      col('proximaRevision', (r) => r.maquinaria?.proximaRevision, formatDate),
      estado,
    ];
  }
  return [...common, col('stockMinimo', (r) => r.epi?.stockMinimo), estado];
});

// --- Paginación, orden y carga ------------------------------------------------

const pagination = ref<{
  page: number;
  rowsPerPage: number;
  rowsNumber: number;
  sortBy?: string | null;
  descending?: boolean;
}>({
  page: state.value.meta.currentPage,
  rowsPerPage: state.value.meta.perPage,
  rowsNumber: state.value.meta.total,
});

// El backend ordena por nombre y no soporta ordenación en servidor: sortBy/descending
// solo reordenan las filas ya cargadas de la página actual.
const sortedItems = computed(() => {
  const { sortBy, descending } = pagination.value;
  const column = sortBy ? columns.value.find((c) => c.name === sortBy) : undefined;
  if (!column || typeof column.field !== 'function') {
    return state.value.items;
  }
  const field = column.field;
  const items = [...state.value.items];
  items.sort((a, b) => {
    const result = String(field(a) ?? '').localeCompare(String(field(b) ?? ''), undefined, {
      numeric: true,
    });
    return descending ? -result : result;
  });
  return items;
});

// Distingue la carga inicial (debe llamar siempre al backend) de un disparo de
// @request causado solo por un cambio de orden de columna.
const hasLoadedOnce = ref(false);

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

watch(
  () => state.value.meta,
  (meta) => {
    pagination.value = {
      ...pagination.value,
      page: meta.currentPage,
      rowsPerPage: meta.perPage,
      rowsNumber: meta.total,
    };
  },
  { deep: true },
);

async function fetchPage(page: number, rowsPerPage: number) {
  try {
    await elemsStore.fetchElems(props.tipoId, page, rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('inventario.fetchError'));
  }
}

async function onRequest(requestProps: {
  pagination: { page: number; rowsPerPage: number; sortBy?: string | null; descending?: boolean };
}) {
  const { page, rowsPerPage } = requestProps.pagination;
  const isSortOnlyChange =
    hasLoadedOnce.value &&
    page === state.value.meta.currentPage &&
    rowsPerPage === state.value.meta.perPage;

  pagination.value = { ...pagination.value, ...requestProps.pagination };

  if (isSortOnlyChange) {
    return;
  }

  await fetchPage(page, rowsPerPage);
  hasLoadedOnce.value = true;
}

async function onFilterClick() {
  appliedFilters.value = buildFilters();
  await fetchPage(1, pagination.value.rowsPerPage);
}

async function onClearClick() {
  form.value = formFromFilters({});
  appliedFilters.value = {};
  await fetchPage(1, pagination.value.rowsPerPage);
}

onMounted(() => {
  void loadSelectOptions();
  void onRequest({
    pagination: { page: pagination.value.page, rowsPerPage: pagination.value.rowsPerPage },
  });
});
</script>

<style scoped>
/* Filtros compactos: la mitad del ancho de col-md-3 (25 %) en escritorio. */
@media (min-width: 1024px) {
  .inventario-filter {
    width: 12.5%;
    min-width: 150px;
  }
}
</style>
