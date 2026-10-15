<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 50vh">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{ t('admin.proveedores.title') }}
        </div>
        <q-btn
          v-if="auth.hasPermission('catalogos.crear')"
          unelevated
          no-caps
          color="primary"
          icon="add"
          :label="t('admin.proveedores.newButton')"
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
            :label="t('admin.proveedores.filters.nombreLabel')"
            @keyup.enter="onFilterClick"
          />
        </div>
        <div class="col-12 col-md-4">
          <q-input
            v-model="filters.telefono"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="t('admin.proveedores.filters.telefonoLabel')"
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
            :label="t('admin.proveedores.filters.filterButton')"
            @click="onFilterClick"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('admin.proveedores.filters.clearButton')"
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
        :loading="proveedoresStore.loading"
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
              <q-tooltip>{{ t('admin.proveedores.editTooltip') }}</q-tooltip>
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
              <q-tooltip>{{ t('admin.proveedores.deleteTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <ProveedorFormDialog
        v-model="formDialogVisible"
        :proveedor="editingProveedor"
        @saved="onSaved"
      />
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useProveedoresStore, type Proveedor, type ProveedoresFilters } from '@/stores/proveedores';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import ProveedorFormDialog from '@/components/admin/ProveedorFormDialog.vue';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const $q = useQuasar();
const { t } = useI18n();
const proveedoresStore = useProveedoresStore();
const auth = useAuthStore();

function formatNullable(val: string | null) {
  return val || '—';
}

const columns = computed<QTableColumn<Proveedor>[]>(() => [
  {
    name: 'nombre',
    label: t('admin.proveedores.columns.nombre'),
    field: 'nombre',
    align: 'left',
    sortable: true,
  },
  {
    name: 'direccion',
    label: t('admin.proveedores.columns.direccion'),
    field: 'direccion',
    align: 'left',
    sortable: true,
    format: formatNullable,
  },
  {
    name: 'telefono',
    label: t('admin.proveedores.columns.telefono'),
    field: 'telefono',
    align: 'left',
    sortable: true,
    format: formatNullable,
  },
  {
    name: 'actions',
    label: t('admin.proveedores.columns.actions'),
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

const filters = ref<{ nombre: string | null; telefono: string | null }>({
  nombre: '',
  telefono: '',
});

// Última combinación de filtros aplicada (vía "Filtrar" o "Limpiar"). Se reutiliza en
// onRequest para que cambiar de página conserve el filtro activo, sin depender de
// lo que haya escrito el usuario en el input sin haber pulsado "Filtrar" todavía.
const appliedFilters = ref<ProveedoresFilters>({});

// El backend no soporta ordenación en servidor: sortBy/descending solo reordenan
// las filas ya cargadas de la página actual.
const sortedItems = computed(() => {
  const { sortBy, descending } = pagination.value;
  if (!sortBy) {
    return proveedoresStore.items;
  }
  const key = sortBy as keyof Proveedor;
  const items = [...proveedoresStore.items];
  items.sort((a, b) => {
    const result = String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
    return descending ? -result : result;
  });
  return items;
});

// Distingue la carga inicial (debe llamar siempre al backend) de un disparo de
// @request causado solo por un cambio de orden de columna, comparando page/rowsPerPage
// contra proveedoresStore.meta actual.
const hasLoadedOnce = ref(false);

const formDialogVisible = ref(false);
const editingProveedor = ref<Proveedor | null>(null);

function notifyError(error: unknown, fallback: string) {
  $q.notify({ type: 'negative', color: 'red-9', message: getApiErrorMessage(error, fallback) });
}

// Sincroniza la paginación local ante cualquier refresco de la lista, venga de un
// @request de la tabla o de una mutación (crear/editar/eliminar) que refresca el
// store internamente sin pasar por onRequest.
watch(
  () => proveedoresStore.meta,
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

function buildFilters(): ProveedoresFilters {
  return {
    ...(filters.value.nombre ? { nombre: filters.value.nombre } : {}),
    ...(filters.value.telefono ? { telefono: filters.value.telefono } : {}),
  };
}

async function onRequest(requestProps: {
  pagination: { page: number; rowsPerPage: number; sortBy?: string | null; descending?: boolean };
}) {
  const { page, rowsPerPage } = requestProps.pagination;
  const isSortOnlyChange =
    hasLoadedOnce.value &&
    page === proveedoresStore.meta.currentPage &&
    rowsPerPage === proveedoresStore.meta.perPage;

  pagination.value = { ...pagination.value, ...requestProps.pagination };

  if (isSortOnlyChange) {
    return;
  }

  try {
    await proveedoresStore.fetchProveedores(page, rowsPerPage, appliedFilters.value);
    hasLoadedOnce.value = true;
  } catch (error) {
    notifyError(error, t('admin.proveedores.fetchError'));
  }
}

async function onFilterClick() {
  appliedFilters.value = buildFilters();
  try {
    await proveedoresStore.fetchProveedores(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('admin.proveedores.fetchError'));
  }
}

async function onClearClick() {
  filters.value = { nombre: '', telefono: '' };
  appliedFilters.value = {};
  try {
    await proveedoresStore.fetchProveedores(1, pagination.value.rowsPerPage, appliedFilters.value);
  } catch (error) {
    notifyError(error, t('admin.proveedores.fetchError'));
  }
}

onMounted(() => {
  void onRequest({
    pagination: { page: pagination.value.page, rowsPerPage: pagination.value.rowsPerPage },
  });
});

function onDeleteConfirm(row: Proveedor) {
  $q.dialog({
    title: t('admin.proveedores.deleteDialogTitle'),
    message: t('admin.proveedores.deleteDialogMessage', { name: row.nombre }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: Proveedor) {
  try {
    await proveedoresStore.deleteProveedor(row.id);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('admin.proveedores.deleteSuccess'),
    });
  } catch (error) {
    notifyError(error, t('admin.proveedores.deleteError'));
  }
}

function openCreateDialog() {
  editingProveedor.value = null;
  formDialogVisible.value = true;
}

function openEditDialog(row: Proveedor) {
  editingProveedor.value = row;
  formDialogVisible.value = true;
}

function onSaved() {
  formDialogVisible.value = false;
}
</script>
