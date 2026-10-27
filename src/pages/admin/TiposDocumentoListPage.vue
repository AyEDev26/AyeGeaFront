<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('admin.tiposDocumento.title') }}
        </div>
        <q-btn
          v-if="auth.hasPermission('catalogos.crear')"
          unelevated
          no-caps
          color="primary"
          icon="add"
          :label="t('admin.tiposDocumento.newButton')"
          class="elegant-btn"
          @click="openCreateDialog"
        />
      </div>

      <div class="row q-col-gutter-sm q-mb-md items-start">
        <div class="col-12 col-md-4">
          <q-input
            v-model="filters.descripcion"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.tiposDocumento.filters.descripcionLabel')"
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
            :label="t('admin.tiposDocumento.filters.filterButton')"
            @click="onFilterClick"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('admin.tiposDocumento.filters.clearButton')"
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
        v-bind="tiposDocumentoStoreLoadingAttrs"
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
              <q-tooltip>{{ t('admin.tiposDocumento.editTooltip') }}</q-tooltip>
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
              <q-tooltip>{{ t('admin.tiposDocumento.deleteTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <TipoDocumentoFormDialog
        v-model="formDialogVisible"
        :tipo-documento="editingTipoDocumento"
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
import {
  useTiposDocumentoStore,
  type TipoDocumento,
  type TiposDocumentoFilters,
} from '@/stores/tiposDocumento';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import TipoDocumentoFormDialog from '@/components/admin/TipoDocumentoFormDialog.vue';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const $q = useQuasar();
const { t } = useI18n();
const tiposDocumentoStore = useTiposDocumentoStore();
const auth = useAuthStore();

const columns = computed<QTableColumn<TipoDocumento>[]>(() => [
  {
    name: 'descripcion',
    label: t('admin.tiposDocumento.columns.descripcion'),
    field: 'descripcion',
    align: 'left',
    sortable: true,
  },
  {
    name: 'actions',
    label: t('admin.tiposDocumento.columns.actions'),
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

const filters = ref<{ descripcion: string | null }>({
  descripcion: '',
});

// Última combinación de filtros aplicada (vía "Filtrar" o "Limpiar"). Se reutiliza en
// onRequest para que cambiar de página conserve el filtro activo, sin depender de
// lo que haya escrito el usuario en el input sin haber pulsado "Filtrar" todavía.
const appliedFilters = ref<TiposDocumentoFilters>({});

// El backend no soporta ordenación en servidor: sortBy/descending solo reordenan
// las filas ya cargadas de la página actual.
const sortedItems = computed(() => {
  const { sortBy, descending } = pagination.value;
  if (!sortBy) {
    return tiposDocumentoStore.items;
  }
  const items = [...tiposDocumentoStore.items];
  items.sort((a, b) => {
    const result = a.descripcion.localeCompare(b.descripcion);
    return descending ? -result : result;
  });
  return items;
});

// Distingue la carga inicial (debe llamar siempre al backend) de un disparo de
// @request causado solo por un cambio de orden de columna, comparando page/rowsPerPage
// contra tiposDocumentoStore.meta actual.
const hasLoadedOnce = ref(false);

const formDialogVisible = ref(false);
const editingTipoDocumento = ref<TipoDocumento | null>(null);

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

// Sincroniza la paginación local ante cualquier refresco de la lista, venga de un
// @request de la tabla o de una mutación (crear/editar/eliminar) que refresca el
// store internamente sin pasar por onRequest.
watch(
  () => tiposDocumentoStore.meta,
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

function buildFilters(): TiposDocumentoFilters {
  const descripcion = filters.value.descripcion?.trim();
  return {
    ...(descripcion ? { descripcion } : {}),
  };
}

async function onRequest(requestProps: {
  pagination: { page: number; rowsPerPage: number; sortBy?: string | null; descending?: boolean };
}) {
  const { page, rowsPerPage } = requestProps.pagination;
  const isSortOnlyChange =
    hasLoadedOnce.value &&
    page === tiposDocumentoStore.meta.currentPage &&
    rowsPerPage === tiposDocumentoStore.meta.perPage;

  pagination.value = { ...pagination.value, ...requestProps.pagination };

  if (isSortOnlyChange) {
    return;
  }

  try {
    await tiposDocumentoStore.fetchTiposDocumento(page, rowsPerPage, appliedFilters.value);
    hasLoadedOnce.value = true;
  } catch (error) {
    notifyError(error, t('admin.tiposDocumento.fetchError'));
  }
}

async function onFilterClick() {
  appliedFilters.value = buildFilters();
  try {
    await tiposDocumentoStore.fetchTiposDocumento(
      1,
      pagination.value.rowsPerPage,
      appliedFilters.value,
    );
  } catch (error) {
    notifyError(error, t('admin.tiposDocumento.fetchError'));
  }
}

async function onClearClick() {
  filters.value = { descripcion: '' };
  appliedFilters.value = {};
  try {
    await tiposDocumentoStore.fetchTiposDocumento(
      1,
      pagination.value.rowsPerPage,
      appliedFilters.value,
    );
  } catch (error) {
    notifyError(error, t('admin.tiposDocumento.fetchError'));
  }
}

onMounted(() => {
  void onRequest({
    pagination: { page: pagination.value.page, rowsPerPage: pagination.value.rowsPerPage },
  });
});

function onDeleteConfirm(row: TipoDocumento) {
  $q.dialog({
    title: t('admin.tiposDocumento.deleteDialogTitle'),
    message: t('admin.tiposDocumento.deleteDialogMessage', { name: row.descripcion }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: TipoDocumento) {
  try {
    await tiposDocumentoStore.deleteTipoDocumento(row.id);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('admin.tiposDocumento.deleteSuccess'),
    });
  } catch (error) {
    notifyError(error, t('admin.tiposDocumento.deleteError'));
  }
}

function openCreateDialog() {
  editingTipoDocumento.value = null;
  formDialogVisible.value = true;
}

function openEditDialog(row: TipoDocumento) {
  editingTipoDocumento.value = row;
  formDialogVisible.value = true;
}

function onSaved() {
  formDialogVisible.value = false;
}

const tiposDocumentoStoreLoadingAttrs = useDelayedLoading(() => tiposDocumentoStore.loading);
</script>
