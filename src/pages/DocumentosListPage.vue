<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('documentos.title') }}
        </div>
        <q-btn
          v-if="auth.hasPermission('documentos.crear')"
          unelevated
          no-caps
          color="primary"
          icon="add"
          :label="t('documentos.newButton')"
          class="elegant-btn"
          @click="openCreateDialog"
        />
      </div>

      <div class="row q-col-gutter-sm q-mb-md items-start">
        <div class="col-12 col-md-3">
          <q-input
            v-model="filters.descripcion"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('documentos.filters.descripcionLabel')"
            @keyup.enter="onFilterClick"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.tipoDocumentoId"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="elegant-input"
            :label="t('documentos.filters.tipoLabel')"
            :options="tipoOptions"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.categoriaId"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="elegant-input"
            :label="t('documentos.filters.categoriaLabel')"
            :options="categoriaOptions"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.subcategoriaId"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="elegant-input"
            :label="t('documentos.filters.subcategoriaLabel')"
            :options="subcategoriaOptions"
          />
        </div>
        <div class="col-12 row q-gutter-x-sm items-center">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="filter_alt"
            class="elegant-btn"
            :label="t('documentos.filters.filterButton')"
            @click="onFilterClick"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('documentos.filters.clearButton')"
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
        :loading="documentosStore.loading"
        @request="onRequest"
      >
        <template #body-cell-categorias="props">
          <q-td :props="props">
            <template v-if="props.row.categorias.length">
              <q-chip v-for="c in props.row.categorias" :key="c.id" dense size="sm">
                {{ c.nombre }}
              </q-chip>
            </template>
            <template v-else>{{ EMPTY }}</template>
          </q-td>
        </template>

        <template #body-cell-subcategorias="props">
          <q-td :props="props">
            <template v-if="props.row.subcategorias.length">
              <q-chip v-for="s in props.row.subcategorias" :key="s.id" dense size="sm">
                {{ s.nombre }}
              </q-chip>
            </template>
            <template v-else>{{ EMPTY }}</template>
          </q-td>
        </template>

        <template #body-cell-fechaCaducidad="props">
          <q-td :props="props">
            <q-chip
              v-if="props.row.fechaCaducidad && props.row.caducado"
              dense
              size="sm"
              color="red-9"
              text-color="white"
              :title="t('documentos.expired')"
            >
              {{ formatDate(props.row.fechaCaducidad) }}
            </q-chip>
            <template v-else>{{ formatDate(props.row.fechaCaducidad) }}</template>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center q-gutter-x-sm">
            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="download"
              @click="onDownload(props.row)"
            >
              <q-tooltip>{{ t('documentos.downloadTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="auth.hasPermission('documentos.editar')"
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="edit"
              @click="openEditDialog(props.row)"
            >
              <q-tooltip>{{ t('documentos.editTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="auth.hasPermission('documentos.eliminar')"
              flat
              round
              dense
              size="sm"
              color="negative"
              icon="delete"
              @click="onDeleteConfirm(props.row)"
            >
              <q-tooltip>{{ t('documentos.deleteTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <DocumentoFormDialog
        v-model="formDialogVisible"
        :documento="editingDocumento"
        :readonly="formReadonly"
        :tipo-options="tipoOptions"
        :categoria-options="categoriaOptions"
        :subcategoria-options="subcategoriaOptions"
        @saved="onSaved"
      />
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useDocumentosStore, type Documento, type DocumentosFilters } from '@/stores/documentos';
import { useTiposDocumentoStore } from '@/stores/tiposDocumento';
import { useCategoriasStore } from '@/stores/categorias';
import { useSubcategoriasStore } from '@/stores/subcategorias';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import DocumentoFormDialog from '@/components/documentos/DocumentoFormDialog.vue';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const EMPTY = '—';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const documentosStore = useDocumentosStore();
const tiposDocumentoStore = useTiposDocumentoStore();
const categoriasStore = useCategoriasStore();
const subcategoriasStore = useSubcategoriasStore();
const auth = useAuthStore();

interface SelectOption {
  label: string;
  value: number;
}

const tipoOptions = ref<SelectOption[]>([]);
const categoriaOptions = ref<SelectOption[]>([]);
const subcategoriaOptions = ref<SelectOption[]>([]);

function formatDate(value: string | null): string {
  if (!value) return EMPTY;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale.value);
}

const columns = computed<QTableColumn<Documento>[]>(() => [
  {
    name: 'descripcion',
    label: t('documentos.columns.descripcion'),
    field: 'descripcion',
    align: 'left',
    sortable: true,
  },
  {
    name: 'tipo',
    label: t('documentos.columns.tipo'),
    field: (row) => row.tipoDocumento?.descripcion ?? EMPTY,
    align: 'left',
    sortable: true,
  },
  {
    name: 'categorias',
    label: t('documentos.columns.categorias'),
    field: 'categorias',
    align: 'left',
  },
  {
    name: 'subcategorias',
    label: t('documentos.columns.subcategorias'),
    field: 'subcategorias',
    align: 'left',
  },
  {
    name: 'fechaCaducidad',
    label: t('documentos.columns.fechaCaducidad'),
    field: 'fechaCaducidad',
    align: 'left',
    sortable: true,
  },
  {
    name: 'nombreOriginal',
    label: t('documentos.columns.nombreOriginal'),
    field: 'nombreOriginal',
    align: 'left',
    sortable: true,
  },
  {
    name: 'actions',
    label: t('documentos.columns.actions'),
    field: 'id',
    align: 'center',
  },
]);

const pagination = ref<{
  page: number;
  rowsPerPage: number;
  rowsNumber: number;
  sortBy?: string | null;
  descending?: boolean;
}>({
  page: 1,
  rowsPerPage: 15,
  rowsNumber: 0,
});

const filters = ref<{
  descripcion: string | null;
  tipoDocumentoId: number | null;
  categoriaId: number | null;
  subcategoriaId: number | null;
}>({
  descripcion: '',
  tipoDocumentoId: null,
  categoriaId: null,
  subcategoriaId: null,
});

// Última combinación de filtros aplicada (vía "Filtrar" o "Limpiar"). Se reutiliza en
// onRequest para que cambiar de página conserve el filtro activo, sin depender de
// lo que haya escrito el usuario sin haber pulsado "Filtrar" todavía.
const appliedFilters = ref<DocumentosFilters>({});

function sortValue(row: Documento, sortBy: string): string {
  switch (sortBy) {
    case 'tipo':
      return row.tipoDocumento?.descripcion ?? '';
    case 'fechaCaducidad':
      return row.fechaCaducidad ?? '';
    case 'nombreOriginal':
      return row.nombreOriginal;
    default:
      return row.descripcion;
  }
}

// El backend no soporta ordenación en servidor: sortBy/descending solo reordenan
// las filas ya cargadas de la página actual.
const sortedItems = computed(() => {
  const { sortBy, descending } = pagination.value;
  if (!sortBy) {
    return documentosStore.items;
  }
  const items = [...documentosStore.items];
  items.sort((a, b) => {
    const result = sortValue(a, sortBy).localeCompare(sortValue(b, sortBy));
    return descending ? -result : result;
  });
  return items;
});

// Distingue la carga inicial (debe llamar siempre al backend) de un disparo de
// @request causado solo por un cambio de orden de columna.
const hasLoadedOnce = ref(false);

const formDialogVisible = ref(false);
const editingDocumento = ref<Documento | null>(null);
// Solo el modo lectura abierto desde `?editar=` lo activa; alta y edición de la tabla no.
const formReadonly = ref(false);

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

// Sincroniza la paginación local ante cualquier refresco de la lista, venga de un
// @request de la tabla o de una mutación que refresca el store internamente.
watch(
  () => documentosStore.meta,
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

function buildFilters(): DocumentosFilters {
  const descripcion = filters.value.descripcion?.trim();
  return {
    ...(descripcion ? { descripcion } : {}),
    ...(filters.value.tipoDocumentoId != null
      ? { tipoDocumentoId: filters.value.tipoDocumentoId }
      : {}),
    ...(filters.value.categoriaId != null ? { categoriaId: filters.value.categoriaId } : {}),
    ...(filters.value.subcategoriaId != null
      ? { subcategoriaId: filters.value.subcategoriaId }
      : {}),
  };
}

async function onRequest(requestProps: {
  pagination: { page: number; rowsPerPage: number; sortBy?: string | null; descending?: boolean };
}) {
  const { page, rowsPerPage } = requestProps.pagination;
  const isSortOnlyChange =
    hasLoadedOnce.value &&
    page === documentosStore.meta.currentPage &&
    rowsPerPage === documentosStore.meta.perPage;

  pagination.value = { ...pagination.value, ...requestProps.pagination };

  if (isSortOnlyChange) {
    return;
  }

  try {
    await documentosStore.fetchDocumentos(page, rowsPerPage, appliedFilters.value);
    hasLoadedOnce.value = true;
  } catch (error) {
    notifyError(error, t('documentos.fetchError'));
  }
}

async function onFilterClick() {
  appliedFilters.value = buildFilters();
  try {
    await documentosStore.fetchDocumentos(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('documentos.fetchError'));
  }
}

async function onClearClick() {
  filters.value = {
    descripcion: '',
    tipoDocumentoId: null,
    categoriaId: null,
    subcategoriaId: null,
  };
  appliedFilters.value = {};
  try {
    await documentosStore.fetchDocumentos(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('documentos.fetchError'));
  }
}

// Las opciones de los selects se cargan una vez y se comparten con el diálogo.
// Un fallo en ellas no debe impedir ver el listado.
async function loadOptions() {
  try {
    const [tipos, categorias, subcategorias] = await Promise.all([
      tiposDocumentoStore.fetchAllTiposDocumento(),
      categoriasStore.fetchAllCategorias(),
      subcategoriasStore.fetchAllSubcategorias(),
    ]);
    tipoOptions.value = tipos.map((tipo) => ({ label: tipo.descripcion, value: tipo.id }));
    categoriaOptions.value = categorias.map((c) => ({ label: c.nombre, value: c.id }));
    subcategoriaOptions.value = subcategorias.map((s) => ({
      label: s.categoria ? `${s.categoria.nombre} › ${s.nombre}` : s.nombre,
      value: s.id,
    }));
  } catch (error) {
    notifyError(error, t('documentos.fetchError'));
  }
}

onMounted(() => {
  void loadOptions();
  void onRequest({
    pagination: { page: pagination.value.page, rowsPerPage: pagination.value.rowsPerPage },
  });
});

async function onDownload(row: Documento) {
  try {
    await documentosStore.downloadDocumento(row);
  } catch (error) {
    notifyError(error, t('documentos.downloadError'));
  }
}

function onDeleteConfirm(row: Documento) {
  $q.dialog({
    title: t('documentos.deleteDialogTitle'),
    message: t('documentos.deleteDialogMessage', { name: row.descripcion }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: Documento) {
  try {
    await documentosStore.deleteDocumento(row.id);
    $q.notify({ type: 'positive', color: 'teal-9', message: t('documentos.deleteSuccess') });
  } catch (error) {
    notifyError(error, t('documentos.deleteError'));
  }
}

function openCreateDialog() {
  editingDocumento.value = null;
  formReadonly.value = false;
  formDialogVisible.value = true;
}

function openEditDialog(row: Documento) {
  editingDocumento.value = row;
  formReadonly.value = false;
  formDialogVisible.value = true;
}

// Quita `editar` de la URL conservando el resto de parámetros.
async function clearEditarQuery() {
  if (route.query.editar === undefined) return;
  const query = { ...route.query };
  delete query.editar;
  await router.replace({ query });
}

// Abre el formulario del documento indicado en `?editar=ID`, con independencia de la
// página o los filtros del listado.
async function openFromQuery(raw: unknown) {
  if (raw === undefined) return;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 0;
  if (id <= 0) {
    await clearEditarQuery();
    return;
  }
  try {
    editingDocumento.value = await documentosStore.fetchDocumento(id);
    formReadonly.value = !auth.hasPermission('documentos.editar');
    formDialogVisible.value = true;
  } catch (error) {
    notifyError(error, t('documentos.detailFetchError'));
    await clearEditarQuery();
  }
}

watch(
  () => route.query.editar,
  (raw) => void openFromQuery(raw),
  { immediate: true },
);

watch(formDialogVisible, (isVisible) => {
  if (!isVisible) void clearEditarQuery();
});

function onSaved() {
  formDialogVisible.value = false;
}
</script>
