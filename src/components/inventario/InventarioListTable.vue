<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ title }}
        </div>
        <div class="row items-center q-gutter-x-sm">
          <q-btn
            no-caps
            color="primary"
            icon="filter_alt"
            class="elegant-btn"
            :unelevated="filtersVisible"
            :outline="!filtersVisible"
            :label="t('inventario.filters.toggleButton')"
            :aria-label="t('inventario.filters.toggleButton')"
            :aria-pressed="filtersVisible"
            @click="toggleFilters"
          >
            <q-badge v-if="appliedFiltersCount > 0" color="orange-8" floating rounded>
              {{ appliedFiltersCount }}
            </q-badge>
            <q-tooltip>{{ t('inventario.filters.toggleButton') }}</q-tooltip>
          </q-btn>
          <q-btn
            v-if="auth.hasPermission('elementos_inventario.ver')"
            unelevated
            no-caps
            color="teal-9"
            icon="download"
            class="elegant-btn"
            :label="t('inventario.export.button')"
            :loading="exporting"
            :disable="state.loading || state.meta.total === 0"
          >
            <q-menu auto-close>
              <q-list dense style="min-width: 150px">
                <q-item clickable @click="exportList('excel')">
                  <q-item-section avatar>
                    <q-icon name="table_view" color="teal-9" />
                  </q-item-section>
                  <q-item-section>{{ t('inventario.export.excel') }}</q-item-section>
                </q-item>
                <q-item clickable @click="exportList('pdf')">
                  <q-item-section avatar>
                    <q-icon name="picture_as_pdf" color="teal-9" />
                  </q-item-section>
                  <q-item-section>{{ t('inventario.export.pdf') }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
          <q-btn
            v-if="auth.hasPermission('elementos_inventario.crear')"
            unelevated
            no-caps
            color="primary"
            icon="add"
            :label="t('inventario.actions.new')"
            class="elegant-btn"
            @click="goToNew"
          />
        </div>
      </div>

      <q-slide-transition>
        <div v-show="filtersVisible">
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
        </div>
      </q-slide-transition>

      <q-table
        v-model:pagination="pagination"
        flat
        bordered
        dense
        class="elegant-table"
        :class="{ 'inventario-table--sticky': hasStickyColumns }"
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
        <template #body-cell-critico="props">
          <q-td :props="props">
            <q-chip
              v-if="props.row.vehiculo?.critico || props.row.maquinaria?.critico"
              dense
              square
              color="red-7"
              text-color="white"
            >
              {{ t('inventario.columns.critico') }}
            </q-chip>
            <template v-else>—</template>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center q-gutter-x-sm">
            <q-btn
              v-if="auth.hasPermission('elementos_inventario.editar')"
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="edit"
              @click="goToEdit(props.row)"
            >
              <q-tooltip>{{ t('inventario.actions.edit') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="auth.hasPermission('elementos_inventario.eliminar')"
              flat
              round
              dense
              size="sm"
              color="negative"
              icon="delete"
              @click="onDeleteConfirm(props.row)"
            >
              <q-tooltip>{{ t('inventario.actions.delete') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import {
  useElemsInventarioStore,
  type ElemInventario,
  type ElemsInventarioFilters,
  type TipoElemInventarioId,
} from '@/stores/elemsInventario';
import { useAuthStore } from '@/stores/auth';
import { useCategoriasStore } from '@/stores/categorias';
import { useSubcategoriasStore, type Subcategoria } from '@/stores/subcategorias';
import { useDelegacionesStore } from '@/stores/delegaciones';
import { useUbicacionesStore } from '@/stores/ubicaciones';
import { useDepartamentosStore } from '@/stores/departamentos';
import { useProveedoresStore } from '@/stores/proveedores';
import { useInventarioListExport } from '@/composables/useInventarioListExport';
import { getApiErrorMessage } from '@/utils/api-error';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  tipoId: TipoElemInventarioId;
  title: string;
}>();

const $q = useQuasar();
const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();
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

// Número de filtros aplicados (solo hay claves con valor, ver buildFilters).
const appliedFiltersCount = computed(() => Object.keys(appliedFilters.value).length);

// --- Visibilidad del formulario de filtros -----------------------------------

// Preferencia por tipo: '1' visible, '0' oculto. Cualquier otro valor se trata como oculto.
const filtersStorageKey = `inventario:filtros-visibles:${props.tipoId}`;

function readFiltersVisible(): boolean {
  try {
    return localStorage.getItem(filtersStorageKey) === '1';
  } catch {
    return false;
  }
}

function writeFiltersVisible(visible: boolean) {
  try {
    localStorage.setItem(filtersStorageKey, visible ? '1' : '0');
  } catch {
    // Sin localStorage la preferencia solo vive en memoria durante la sesión.
  }
}

const filtersVisible = ref<boolean>(readFiltersVisible());

function toggleFilters() {
  filtersVisible.value = !filtersVisible.value;
  writeFiltersVisible(filtersVisible.value);
}

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

// Vehículos y maquinaria: referencia y nombre quedan ancladas a la izquierda (SPEC 20).
const hasStickyColumns = computed(() => props.tipoId !== 3);

function withStickyColumns(cols: QTableColumn<ElemInventario>[]): QTableColumn<ElemInventario>[] {
  const sticky: Record<string, string> = {
    referencia: 'sticky-col sticky-col--referencia',
    nombre: 'sticky-col sticky-col--nombre',
  };
  return cols.map((c) => {
    const cls = sticky[c.name];
    return cls ? { ...c, classes: cls, headerClasses: cls } : c;
  });
}

const dataColumns = computed<QTableColumn<ElemInventario>[]>(() => {
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

  const base = [
    col('referencia', (r) => r.referencia),
    col('nombre', (r) => r.nombre),
    col('categoria', (r) => r.categoria?.nombre),
  ];
  const delegacion = col('delegacion', (r) => r.delegacion?.nombre);
  const common = [
    ...base,
    col('subcategoria', (r) => r.subcategoria?.nombre),
    delegacion,
    col('ubicacion', (r) => r.ubicacion?.nombre),
  ];
  // Vehículos y maquinaria: sin subcategoría ni ubicación (SPEC 20).
  const commonRevisables = [...base, delegacion];
  const critico = (r: ElemInventario) => (r.vehiculo?.critico || r.maquinaria?.critico ? 1 : 0);
  const estado: QTableColumn<ElemInventario> = {
    name: 'estado',
    label: t('inventario.columns.estado'),
    field: (r) => r.estadoId,
    align: 'left',
    sortable: true,
  };

  if (props.tipoId === 1) {
    return withStickyColumns([
      ...commonRevisables,
      col('matricula', (r) => r.vehiculo?.matricula),
      col('marcaModelo', (r) => marcaModelo(r.vehiculo?.marca, r.vehiculo?.modelo)),
      col('ultimaRevision', (r) => r.vehiculo?.ultimaRevision, formatDate),
      col('proximaRevision', (r) => r.vehiculo?.proximaRevision, formatDate),
      col('responsable', (r) => r.vehiculo?.responsable?.nombre),
      col('critico', critico),
      estado,
    ]);
  }
  if (props.tipoId === 2) {
    return withStickyColumns([
      ...commonRevisables,
      col('marcaModelo', (r) => marcaModelo(r.maquinaria?.marca, r.maquinaria?.modelo)),
      col('ultimaRevision', (r) => r.maquinaria?.ultimaRevision, formatDate),
      col('proximaRevision', (r) => r.maquinaria?.proximaRevision, formatDate),
      col('responsable', (r) => r.maquinaria?.responsable?.nombre),
      col('critico', critico),
      estado,
    ]);
  }
  return [...common, col('stockMinimo', (r) => r.epi?.stockMinimo), estado];
});

// --- Exportación ---------------------------------------------------------------

const { exporting, exportList } = useInventarioListExport({
  tipoId: () => props.tipoId,
  dataColumns,
  appliedFilters,
  filterOptions: () => ({
    categoriaId: categoriaSelect.all.value,
    subcategoriaId: allSubcategorias.value,
    delegacionId: delegacionSelect.all.value,
    ubicacionId: ubicacionSelect.all.value,
    departamentoId: departamentoSelect.all.value,
    proveedorId: proveedorSelect.all.value,
  }),
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
// La columna de acciones solo aparece si el usuario puede editar o eliminar.
const columns = computed<QTableColumn<ElemInventario>[]>(() => {
  if (
    !auth.hasPermission('elementos_inventario.editar') &&
    !auth.hasPermission('elementos_inventario.eliminar')
  ) {
    return dataColumns.value;
  }
  return [
    ...dataColumns.value,
    {
      name: 'actions',
      label: t('inventario.actions.columnLabel'),
      field: 'id',
      align: 'center',
    },
  ];
});

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

const TIPO_PATHS = { 1: 'vehiculos', 2: 'maquinaria', 3: 'epis' } as const;
const basePath = computed(() => `/inventario/${TIPO_PATHS[props.tipoId]}`);

function goToNew() {
  void router.push(`${basePath.value}/nuevo`);
}

function goToEdit(row: ElemInventario) {
  void router.push(`${basePath.value}/${row.id}/editar`);
}

function onDeleteConfirm(row: ElemInventario) {
  $q.dialog({
    title: t('inventario.delete.title'),
    message: t('inventario.delete.message', { nombre: row.nombre }),
    ok: { label: t('inventario.delete.confirm'), color: 'negative', flat: true, noCaps: true },
    cancel: { label: t('common.cancel'), flat: true, noCaps: true, color: 'grey-7' },
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: ElemInventario) {
  // El borrado invalida el estado del tipo: se guarda la página y los filtros para recargarla.
  const { page, rowsPerPage } = pagination.value;
  const targetPage = state.value.items.length === 1 && page > 1 ? page - 1 : page;
  try {
    await elemsStore.deleteElem(row.id, props.tipoId);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('inventario.delete.success') });
  } catch (error) {
    notifyError(error, t('inventario.delete.error'));
    return;
  }
  await fetchPage(targetPage, rowsPerPage);
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

/* Columnas fijas: referencia y nombre se anclan a la izquierda al hacer scroll horizontal. */
.inventario-table--sticky :deep(.sticky-col) {
  position: sticky;
  z-index: 1;
  background-color: #ffffff;
}

.inventario-table--sticky :deep(th.sticky-col) {
  z-index: 2;
}

.inventario-table--sticky :deep(.sticky-col--referencia) {
  left: 0;
  width: 130px;
  min-width: 130px;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inventario-table--sticky :deep(.sticky-col--nombre) {
  left: 130px;
  min-width: 180px;
  max-width: 240px;
  white-space: normal;
  box-shadow: 2px 0 4px -2px rgba(15, 23, 42, 0.25);
}
</style>
