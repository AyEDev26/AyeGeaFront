<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('admin.almacenes.title') }}
        </div>
        <q-btn
          v-if="auth.hasPermission('catalogos.crear')"
          unelevated
          no-caps
          color="primary"
          icon="add"
          :label="t('admin.almacenes.newButton')"
          class="elegant-btn"
          @click="openCreateDialog"
        />
      </div>

      <div class="row q-col-gutter-sm q-mb-md items-start">
        <div class="col-12 col-md-4">
          <q-input
            v-model="filters.nombre"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.almacenes.filters.nombreLabel')"
            @keyup.enter="onFilterClick"
          />
        </div>
        <div class="col-12 col-md-3 row q-gutter-x-sm items-center">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="filter_alt"
            class="elegant-btn"
            :label="t('admin.almacenes.filters.filterButton')"
            @click="onFilterClick"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('admin.almacenes.filters.clearButton')"
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
        :loading="almacenesStore.loading"
        @request="onRequest"
      >
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center q-gutter-x-sm">
            <q-btn
              v-if="auth.hasPermission('catalogos.editar')"
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="edit"
              @click="openEditDialog(props.row)"
            >
              <q-tooltip>{{ t('admin.almacenes.editTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="auth.hasPermission('catalogos.eliminar')"
              flat
              round
              dense
              size="sm"
              color="negative"
              icon="delete"
              @click="onDeleteConfirm(props.row)"
            >
              <q-tooltip>{{ t('admin.almacenes.deleteTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <AlmacenFormDialog v-model="formDialogVisible" :almacen="editingAlmacen" @saved="onSaved" />
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAlmacenesStore, type Almacen, type AlmacenesFilters } from '@/stores/almacenes';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import AlmacenFormDialog from '@/components/admin/AlmacenFormDialog.vue';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const $q = useQuasar();
const { t } = useI18n();
const almacenesStore = useAlmacenesStore();
const auth = useAuthStore();

const columns = computed<QTableColumn<Almacen>[]>(() => [
  {
    name: 'nombre',
    label: t('admin.almacenes.columns.nombre'),
    field: 'nombre',
    align: 'left',
    sortable: true,
  },
  {
    name: 'prefijo',
    label: t('admin.almacenes.columns.prefijo'),
    field: 'prefijo',
    align: 'left',
    sortable: true,
  },
  {
    name: 'delegacion',
    label: t('admin.almacenes.columns.delegacion'),
    field: (row) => row.delegacion?.nombre ?? '',
    align: 'left',
    sortable: true,
  },
  {
    name: 'ubicacion',
    label: t('admin.almacenes.columns.ubicacion'),
    field: (row) => row.ubicacion?.nombre ?? '',
    align: 'left',
    sortable: true,
  },
  {
    name: 'responsable',
    label: t('admin.almacenes.columns.responsable'),
    field: (row) => row.responsable?.name ?? '',
    align: 'left',
    sortable: true,
  },
  { name: 'actions', label: t('admin.almacenes.columns.actions'), field: 'id', align: 'center' },
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

const filters = ref<{ nombre: string | null }>({ nombre: '' });

// Última combinación de filtros aplicada (vía "Filtrar" o "Limpiar"). Se reutiliza en
// onRequest para que cambiar de página conserve el filtro activo, sin depender de
// lo que haya escrito el usuario en el input sin haber pulsado "Filtrar" todavía.
const appliedFilters = ref<AlmacenesFilters>({});

function getSortValue(row: Almacen, key: string): string {
  switch (key) {
    case 'nombre':
      return row.nombre;
    case 'prefijo':
      return row.prefijo ?? '';
    case 'delegacion':
      return row.delegacion?.nombre ?? '';
    case 'ubicacion':
      return row.ubicacion?.nombre ?? '';
    case 'responsable':
      return row.responsable?.name ?? '';
    default:
      return '';
  }
}

// El backend no soporta ordenación en servidor: sortBy/descending solo reordenan
// las filas ya cargadas de la página actual. Los valores null van primero.
const sortedItems = computed(() => {
  const { sortBy, descending } = pagination.value;
  if (!sortBy) {
    return almacenesStore.items;
  }
  const items = [...almacenesStore.items];
  items.sort((a, b) => {
    const result = getSortValue(a, sortBy).localeCompare(getSortValue(b, sortBy));
    return descending ? -result : result;
  });
  return items;
});

// Distingue la carga inicial (debe llamar siempre al backend) de un disparo de
// @request causado solo por un cambio de orden de columna, comparando page/rowsPerPage
// contra almacenesStore.meta actual.
const hasLoadedOnce = ref(false);

const formDialogVisible = ref(false);
const editingAlmacen = ref<Almacen | null>(null);

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

// Sincroniza la paginación local ante cualquier refresco de la lista, venga de un
// @request de la tabla o de una mutación (crear/editar/eliminar) que refresca el
// store internamente sin pasar por onRequest.
watch(
  () => almacenesStore.meta,
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

function buildFilters(): AlmacenesFilters {
  return filters.value.nombre ? { nombre: filters.value.nombre } : {};
}

async function onRequest(requestProps: {
  pagination: { page: number; rowsPerPage: number; sortBy?: string | null; descending?: boolean };
}) {
  const { page, rowsPerPage } = requestProps.pagination;
  const isSortOnlyChange =
    hasLoadedOnce.value &&
    page === almacenesStore.meta.currentPage &&
    rowsPerPage === almacenesStore.meta.perPage;

  pagination.value = { ...pagination.value, ...requestProps.pagination };

  if (isSortOnlyChange) {
    return;
  }

  try {
    await almacenesStore.fetchAlmacenes(page, rowsPerPage, appliedFilters.value);
    hasLoadedOnce.value = true;
  } catch (error) {
    notifyError(error, t('admin.almacenes.fetchError'));
  }
}

async function onFilterClick() {
  appliedFilters.value = buildFilters();
  try {
    await almacenesStore.fetchAlmacenes(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('admin.almacenes.fetchError'));
  }
}

async function onClearClick() {
  filters.value = { nombre: '' };
  appliedFilters.value = {};
  try {
    await almacenesStore.fetchAlmacenes(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('admin.almacenes.fetchError'));
  }
}

onMounted(() => {
  void onRequest({
    pagination: { page: pagination.value.page, rowsPerPage: pagination.value.rowsPerPage },
  });
});

function onDeleteConfirm(row: Almacen) {
  $q.dialog({
    title: t('admin.almacenes.deleteDialogTitle'),
    message: t('admin.almacenes.deleteDialogMessage', { name: row.nombre }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: Almacen) {
  try {
    await almacenesStore.deleteAlmacen(row.id);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('admin.almacenes.deleteSuccess'),
    });
  } catch (error) {
    notifyError(error, t('admin.almacenes.deleteError'));
  }
}

function openCreateDialog() {
  editingAlmacen.value = null;
  formDialogVisible.value = true;
}

function openEditDialog(row: Almacen) {
  editingAlmacen.value = row;
  formDialogVisible.value = true;
}

function onSaved() {
  formDialogVisible.value = false;
}
</script>
