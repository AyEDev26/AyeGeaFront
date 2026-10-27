<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('admin.ubicaciones.title') }}
        </div>
        <q-btn
          v-if="auth.hasPermission('catalogos.crear')"
          unelevated
          no-caps
          color="primary"
          icon="add"
          :label="t('admin.ubicaciones.newButton')"
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
            :label="t('admin.ubicaciones.filters.nombreLabel')"
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
            :label="t('admin.ubicaciones.filters.filterButton')"
            @click="onFilterClick"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('admin.ubicaciones.filters.clearButton')"
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
        v-bind="ubicacionesStoreLoadingAttrs"
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
              <q-tooltip>{{ t('admin.ubicaciones.editTooltip') }}</q-tooltip>
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
              <q-tooltip>{{ t('admin.ubicaciones.deleteTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <UbicacionFormDialog
        v-model="formDialogVisible"
        :ubicacion="editingUbicacion"
        @saved="onSaved"
      />
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { useDelayedLoading } from '@/composables/useDelayedLoading';
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useUbicacionesStore, type Ubicacion, type UbicacionesFilters } from '@/stores/ubicaciones';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import UbicacionFormDialog from '@/components/admin/UbicacionFormDialog.vue';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const $q = useQuasar();
const { t } = useI18n();
const ubicacionesStore = useUbicacionesStore();
const auth = useAuthStore();

const columns = computed<QTableColumn<Ubicacion>[]>(() => [
  {
    name: 'nombre',
    label: t('admin.ubicaciones.columns.nombre'),
    field: 'nombre',
    align: 'left',
    sortable: true,
  },
  {
    name: 'direccion',
    label: t('admin.ubicaciones.columns.direccion'),
    field: 'direccion',
    align: 'left',
    sortable: true,
  },
  {
    name: 'prefijo',
    label: t('admin.ubicaciones.columns.prefijo'),
    field: 'prefijo',
    align: 'left',
    sortable: true,
  },
  {
    name: 'delegacion',
    label: t('admin.ubicaciones.columns.delegacion'),
    field: (row) => row.delegacion?.nombre ?? '',
    align: 'left',
    sortable: true,
  },
  { name: 'actions', label: t('admin.ubicaciones.columns.actions'), field: 'id', align: 'center' },
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
const appliedFilters = ref<UbicacionesFilters>({});

function getSortValue(row: Ubicacion, key: string): string {
  switch (key) {
    case 'nombre':
      return row.nombre;
    case 'direccion':
      return row.direccion ?? '';
    case 'prefijo':
      return row.prefijo ?? '';
    case 'delegacion':
      return row.delegacion?.nombre ?? '';
    default:
      return '';
  }
}

// El backend no soporta ordenación en servidor: sortBy/descending solo reordenan
// las filas ya cargadas de la página actual. Los valores null van primero.
const sortedItems = computed(() => {
  const { sortBy, descending } = pagination.value;
  if (!sortBy) {
    return ubicacionesStore.items;
  }
  const items = [...ubicacionesStore.items];
  items.sort((a, b) => {
    const result = getSortValue(a, sortBy).localeCompare(getSortValue(b, sortBy));
    return descending ? -result : result;
  });
  return items;
});

// Distingue la carga inicial (debe llamar siempre al backend) de un disparo de
// @request causado solo por un cambio de orden de columna, comparando page/rowsPerPage
// contra ubicacionesStore.meta actual.
const hasLoadedOnce = ref(false);

const formDialogVisible = ref(false);
const editingUbicacion = ref<Ubicacion | null>(null);

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

// Sincroniza la paginación local ante cualquier refresco de la lista, venga de un
// @request de la tabla o de una mutación (crear/editar/eliminar) que refresca el
// store internamente sin pasar por onRequest.
watch(
  () => ubicacionesStore.meta,
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

function buildFilters(): UbicacionesFilters {
  return filters.value.nombre ? { nombre: filters.value.nombre } : {};
}

async function onRequest(requestProps: {
  pagination: { page: number; rowsPerPage: number; sortBy?: string | null; descending?: boolean };
}) {
  const { page, rowsPerPage } = requestProps.pagination;
  const isSortOnlyChange =
    hasLoadedOnce.value &&
    page === ubicacionesStore.meta.currentPage &&
    rowsPerPage === ubicacionesStore.meta.perPage;

  pagination.value = { ...pagination.value, ...requestProps.pagination };

  if (isSortOnlyChange) {
    return;
  }

  try {
    await ubicacionesStore.fetchUbicaciones(page, rowsPerPage, appliedFilters.value);
    hasLoadedOnce.value = true;
  } catch (error) {
    notifyError(error, t('admin.ubicaciones.fetchError'));
  }
}

async function onFilterClick() {
  appliedFilters.value = buildFilters();
  try {
    await ubicacionesStore.fetchUbicaciones(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('admin.ubicaciones.fetchError'));
  }
}

async function onClearClick() {
  filters.value = { nombre: '' };
  appliedFilters.value = {};
  try {
    await ubicacionesStore.fetchUbicaciones(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('admin.ubicaciones.fetchError'));
  }
}

onMounted(() => {
  void onRequest({
    pagination: { page: pagination.value.page, rowsPerPage: pagination.value.rowsPerPage },
  });
});

function onDeleteConfirm(row: Ubicacion) {
  $q.dialog({
    title: t('admin.ubicaciones.deleteDialogTitle'),
    message: t('admin.ubicaciones.deleteDialogMessage', { name: row.nombre }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: Ubicacion) {
  try {
    await ubicacionesStore.deleteUbicacion(row.id);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('admin.ubicaciones.deleteSuccess'),
    });
  } catch (error) {
    notifyError(error, t('admin.ubicaciones.deleteError'));
  }
}

function openCreateDialog() {
  editingUbicacion.value = null;
  formDialogVisible.value = true;
}

function openEditDialog(row: Ubicacion) {
  editingUbicacion.value = row;
  formDialogVisible.value = true;
}

function onSaved() {
  formDialogVisible.value = false;
}

const ubicacionesStoreLoadingAttrs = useDelayedLoading(() => ubicacionesStore.loading);
</script>
