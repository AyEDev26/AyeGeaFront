<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="text-h5 text-weight-bolder text-teal-10 font-outfit q-mb-sm">
        {{ t('admin.categorias.title') }}
      </div>

      <div class="row justify-end q-mb-md">
        <q-btn
          v-if="auth.hasPermission('catalogos.crear')"
          unelevated
          no-caps
          color="primary"
          icon="add"
          :label="t('admin.categorias.newButton')"
          class="elegant-btn"
          @click="openCategoriaCreate"
        />
      </div>

      <div class="row q-col-gutter-sm q-mb-md items-start">
        <div class="col-12 col-md-3">
          <q-input
            v-model="catFilters.nombre"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.categorias.filters.nombreLabel')"
            @keyup.enter="onCatFilter"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-input
            v-model="catFilters.prefijo"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.categorias.filters.prefijoLabel')"
            @keyup.enter="onCatFilter"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="catFilters.tipoId"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="elegant-input"
            option-value="id"
            option-label="descripcion"
            :options="tiposStore.items"
            :label="t('admin.categorias.filters.tipoLabel')"
          />
        </div>
        <div class="col-12 col-md-3 row q-gutter-x-sm items-center">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="filter_alt"
            class="elegant-btn"
            :label="t('admin.categorias.filters.filterButton')"
            @click="onCatFilter"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('admin.categorias.filters.clearButton')"
            @click="onCatClear"
          />
        </div>
      </div>

      <q-table
        v-model:pagination="cat.pagination.value"
        flat
        bordered
        dense
        class="elegant-table"
        :rows="catRows"
        :columns="categoriaColumns"
        row-key="id"
        :rows-per-page-options="ROWS_PER_PAGE_OPTIONS"
        v-bind="categoriasStoreLoadingAttrs"
        @request="cat.onRequest"
      >
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center q-gutter-x-sm">
            <q-btn
              v-if="auth.hasPermission('documentos.ver')"
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="description"
              @click="openDocumentos(props.row)"
            >
              <q-tooltip>{{ t('documentosAsociados.buttonTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="account_tree"
              @click="openSubcategorias(props.row)"
            >
              <q-tooltip>{{ t('admin.categorias.subcategoriasTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="auth.hasPermission('catalogos.editar')"
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="edit"
              @click="openCategoriaEdit(props.row)"
            >
              <q-tooltip>{{ t('admin.categorias.editTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="auth.hasPermission('catalogos.eliminar')"
              flat
              round
              dense
              size="sm"
              color="negative"
              icon="delete"
              @click="onCategoriaDeleteConfirm(props.row)"
            >
              <q-tooltip>{{ t('admin.categorias.deleteTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <CategoriaFormDialog
        v-model="categoriaDialogVisible"
        :categoria="editingCategoria"
        @saved="onCategoriaSaved"
      />
      <SubcategoriasDeCategoriaDialog
        v-model="subcategoriasDialogVisible"
        :categoria-id="subcategoriasTarget.id"
        :categoria-nombre="subcategoriasTarget.nombre"
      />
      <DocumentosAsociadosDialog
        v-model="documentosDialogVisible"
        tipo="categoria"
        :id="documentosTarget.id"
        :nombre="documentosTarget.nombre"
      />
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { useDelayedLoading } from '@/composables/useDelayedLoading';
import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import type { PaginationMeta } from '@/stores/users';
import { useCategoriasStore, type Categoria, type CategoriasFilters } from '@/stores/categorias';
import { useTiposElementoStore } from '@/stores/tiposElemento';
import { getApiErrorMessage } from '@/utils/api-error';
import CategoriaFormDialog from '@/components/admin/CategoriaFormDialog.vue';
import SubcategoriasDeCategoriaDialog from '@/components/admin/SubcategoriasDeCategoriaDialog.vue';
import DocumentosAsociadosDialog from '@/components/documentos/DocumentosAsociadosDialog.vue';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50];

const $q = useQuasar();
const { t } = useI18n();
const auth = useAuthStore();
const categoriasStore = useCategoriasStore();
const tiposStore = useTiposElementoStore();

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

function dash(val: string | null | undefined) {
  return val || '—';
}

// ------------------------------------------------------------------
// Estado de paginación por pestaña
// ------------------------------------------------------------------

interface TablePagination {
  page: number;
  rowsPerPage: number;
  rowsNumber: number;
  sortBy?: string | null;
  descending?: boolean;
}

// Cada pestaña mantiene su propia paginación y filtros aplicados. La paginación local se
// sincroniza con store.meta ante cualquier refresco (incluidas mutaciones que refrescan el
// store sin pasar por onRequest).
function useTabList<F>(
  meta: Ref<PaginationMeta>,
  fetchFn: (page: number, perPage: number, filters: F) => Promise<void>,
  emptyFilters: F,
  fetchError: () => string,
) {
  const pagination = ref<TablePagination>({ page: 1, rowsPerPage: 15, rowsNumber: 0 });
  // Última combinación aplicada con "Filtrar"/"Limpiar": cambiar de página la conserva
  // sin depender de lo escrito en los inputs sin aplicar.
  const appliedFilters = ref(emptyFilters) as Ref<F>;
  const hasLoadedOnce = ref(false);

  watch(
    meta,
    (m) => {
      pagination.value = {
        ...pagination.value,
        page: m.currentPage,
        rowsPerPage: m.perPage,
        rowsNumber: m.total,
      };
    },
    { deep: true },
  );

  async function load(page: number, perPage: number) {
    try {
      await fetchFn(page, perPage, appliedFilters.value);
      hasLoadedOnce.value = true;
    } catch (error) {
      notifyError(error, fetchError());
    }
  }

  async function onRequest(requestProps: {
    pagination: Partial<TablePagination> & { page: number; rowsPerPage: number };
  }) {
    const { page, rowsPerPage } = requestProps.pagination;
    // El backend no ordena en servidor: un cambio solo de orden no recarga.
    const isSortOnlyChange =
      hasLoadedOnce.value && page === meta.value.currentPage && rowsPerPage === meta.value.perPage;
    pagination.value = { ...pagination.value, ...requestProps.pagination };
    if (isSortOnlyChange) return;
    await load(page, rowsPerPage);
  }

  async function applyFilters(filters: F) {
    appliedFilters.value = filters;
    await load(1, pagination.value.rowsPerPage);
  }

  function ensureLoaded() {
    if (hasLoadedOnce.value) return;
    void load(pagination.value.page, pagination.value.rowsPerPage);
  }

  return { pagination, onRequest, applyFilters, ensureLoaded };
}

// Ordenación solo sobre la página cargada.
function sortRows<R extends Record<string, unknown>>(
  rows: R[],
  columns: QTableColumn<R>[],
  p: TablePagination,
): R[] {
  if (!p.sortBy) return rows;
  const col = columns.find((c) => c.name === p.sortBy);
  if (!col) return rows;
  const get = (row: R) =>
    typeof col.field === 'function' ? col.field(row) : row[col.field as keyof R];
  return [...rows].sort((a, b) => {
    const result = String(get(a) ?? '').localeCompare(String(get(b) ?? ''));
    return p.descending ? -result : result;
  });
}

// ------------------------------------------------------------------
// Opciones de selects
// ------------------------------------------------------------------

async function loadTipos() {
  try {
    await tiposStore.fetchTipos();
  } catch (error) {
    notifyError(error, t('admin.categorias.fetchError'));
  }
}

// ------------------------------------------------------------------
// Categorías
// ------------------------------------------------------------------

const cat = useTabList<CategoriasFilters>(
  computed(() => categoriasStore.meta),
  (page, perPage, f) => categoriasStore.fetchCategorias(page, perPage, f),
  {},
  () => t('admin.categorias.fetchError'),
);

const catFilters = ref<{ nombre: string | null; prefijo: string | null; tipoId: number | null }>({
  nombre: '',
  prefijo: '',
  tipoId: null,
});

const categoriaColumns = computed<QTableColumn<Categoria>[]>(() => [
  {
    name: 'nombre',
    label: t('admin.categorias.columns.nombre'),
    field: 'nombre',
    align: 'left',
    sortable: true,
  },
  {
    name: 'tipo',
    label: t('admin.categorias.columns.tipo'),
    field: (row) => dash(row.tipoElementoInventario?.descripcion),
    align: 'left',
    sortable: true,
  },
  {
    name: 'prefijo',
    label: t('admin.categorias.columns.prefijo'),
    field: 'prefijo',
    align: 'left',
    sortable: true,
    format: dash,
  },
  {
    name: 'actions',
    label: t('admin.categorias.columns.actions'),
    field: 'id',
    align: 'center',
  },
]);

const catRows = computed(() =>
  sortRows(categoriasStore.items, categoriaColumns.value, cat.pagination.value),
);

function onCatFilter() {
  void cat.applyFilters({
    ...(catFilters.value.nombre ? { nombre: catFilters.value.nombre } : {}),
    ...(catFilters.value.prefijo ? { prefijo: catFilters.value.prefijo } : {}),
    ...(catFilters.value.tipoId ? { tipoElementoInventarioId: catFilters.value.tipoId } : {}),
  });
}

function onCatClear() {
  catFilters.value = { nombre: '', prefijo: '', tipoId: null };
  void cat.applyFilters({});
}

const categoriaDialogVisible = ref(false);
const editingCategoria = ref<Categoria | null>(null);

function openCategoriaCreate() {
  editingCategoria.value = null;
  categoriaDialogVisible.value = true;
}

function openCategoriaEdit(row: Categoria) {
  editingCategoria.value = row;
  categoriaDialogVisible.value = true;
}

function onCategoriaSaved() {
  categoriaDialogVisible.value = false;
}

function onCategoriaDeleteConfirm(row: Categoria) {
  $q.dialog({
    title: t('admin.categorias.deleteDialogTitle'),
    message: t('admin.categorias.deleteDialogMessage', { name: row.nombre }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onCategoriaDelete(row);
  });
}

async function onCategoriaDelete(row: Categoria) {
  try {
    await categoriasStore.deleteCategoria(row.id);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.categorias.deleteSuccess') });
  } catch (error) {
    notifyError(error, t('admin.categorias.deleteError'));
  }
}

// ------------------------------------------------------------------
// Subcategorías de una categoría
// ------------------------------------------------------------------

const subcategoriasDialogVisible = ref(false);
const subcategoriasTarget = ref<{ id: number; nombre: string }>({ id: 0, nombre: '' });

function openSubcategorias(row: Categoria) {
  subcategoriasTarget.value = { id: row.id, nombre: row.nombre };
  subcategoriasDialogVisible.value = true;
}

// ------------------------------------------------------------------
// Documentos asociados
// ------------------------------------------------------------------

const documentosDialogVisible = ref(false);
const documentosTarget = ref<{ id: number | null; nombre: string }>({ id: null, nombre: '' });

function openDocumentos(row: Categoria) {
  documentosTarget.value = { id: row.id, nombre: row.nombre };
  documentosDialogVisible.value = true;
}

onMounted(() => {
  cat.ensureLoaded();
  void loadTipos();
});

const categoriasStoreLoadingAttrs = useDelayedLoading(() => categoriasStore.loading);
</script>
