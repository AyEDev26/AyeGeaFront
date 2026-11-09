<template>
  <div v-if="!canView" class="text-grey-7 text-center q-py-lg">
    <q-icon name="lock" size="sm" class="q-mr-xs" />
    {{ t('inventarioRevisiones.noAccess') }}
  </div>

  <div v-else-if="errorMessage" class="column items-center q-gutter-y-sm q-py-md">
    <div class="text-red-9 text-center">{{ errorMessage }}</div>
    <q-btn
      flat
      no-caps
      color="primary"
      icon="refresh"
      :label="t('inventarioRevisiones.retry')"
      @click="reload"
    />
  </div>

  <div v-else>
    <div class="row q-col-gutter-sm q-mb-md items-start">
      <div class="col-12 col-sm-4 col-md-3">
        <q-select
          v-model="estadoId"
          outlined
          dense
          clearable
          emit-value
          map-options
          class="elegant-input"
          :label="t('inventarioRevisiones.filters.estado')"
          :options="estadoOptions"
          @update:model-value="onFilterChange"
        />
      </div>
      <div class="col-12 col-sm-4 col-md-3">
        <q-select
          v-model="prioridadId"
          outlined
          dense
          clearable
          emit-value
          map-options
          class="elegant-input"
          :label="t('inventarioRevisiones.filters.prioridad')"
          :options="prioridadOptions"
          @update:model-value="onFilterChange"
        />
      </div>
      <q-space />
      <div v-if="canCreate" class="col-auto">
        <q-btn
          unelevated
          no-caps
          dense
          color="primary"
          icon="add"
          class="elegant-btn px-md"
          :label="t('inventarioRevisiones.addButton')"
          @click="openCreate"
        />
      </div>
    </div>

    <q-table
      v-model:pagination="pagination"
      flat
      bordered
      dense
      class="elegant-table"
      :rows="revisionesStore.items"
      :columns="columns"
      row-key="id"
      :rows-per-page-options="[10, 15, 25, 50]"
      :no-data-label="t('inventarioRevisiones.empty')"
      v-bind="loadingAttrs"
      @request="onRequest"
    >
      <template #body-cell-estado="cell">
        <q-td :props="cell">
          <q-chip
            square
            class="q-ma-none text-weight-medium"
            :color="estadoColor(cell.row.estadoId)"
            text-color="white"
          >
            {{ cell.row.estado.descripcion }}
          </q-chip>
          <div
            v-if="cell.row.estadoId === REVISION_ESTADO.CANCELADA && cell.row.motivoCancelacion"
            class="text-caption text-grey-8 q-mt-xs"
          >
            {{ cell.row.motivoCancelacion }}
          </div>
        </q-td>
      </template>

      <template #body-cell-acciones="cell">
        <q-td :props="cell" class="text-center q-gutter-x-sm">
          <q-btn flat round dense size="sm" color="primary" icon="edit" @click="openEdit(cell.row)">
            <q-tooltip>{{ t('inventarioRevisiones.editTooltip') }}</q-tooltip>
          </q-btn>
          <template v-if="canEdit && cell.row.estadoId === REVISION_ESTADO.PENDIENTE">
            <q-btn
              flat
              round
              dense
              size="sm"
              color="positive"
              icon="check_circle"
              @click="openRealizar(cell.row)"
            >
              <q-tooltip>{{ t('inventarioRevisiones.realizarTooltip') }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              size="sm"
              color="negative"
              icon="cancel"
              @click="openCancelar(cell.row)"
            >
              <q-tooltip>{{ t('inventarioRevisiones.cancelarTooltip') }}</q-tooltip>
            </q-btn>
          </template>
          <q-btn
            v-if="canDelete"
            flat
            round
            dense
            size="sm"
            color="negative"
            icon="delete"
            @click="onDeleteConfirm(cell.row)"
          >
            <q-tooltip>{{ t('inventarioRevisiones.deleteTooltip') }}</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <RevisionFormDialog
      v-model="dialogVisible"
      :elem-inventario-id="props.id"
      :revision="editingRevision"
      :prioridad-options="prioridadOptions"
      @saved="onSaved"
    />
    <RevisionRealizarDialog v-model="realizarVisible" :revision="actionRevision" @saved="onSaved" />
    <RevisionCancelarDialog v-model="cancelarVisible" :revision="actionRevision" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useDelayedLoading } from '@/composables/useDelayedLoading';
import { useAuthStore } from '@/stores/auth';
import { useAuxiliaresInventarioStore } from '@/stores/auxiliaresInventario';
import { REVISION_ESTADO, useRevisionesStore, type Revision } from '@/stores/revisiones';
import { getApiErrorMessage } from '@/utils/api-error';
import RevisionFormDialog from '@/components/inventario/RevisionFormDialog.vue';
import RevisionRealizarDialog from '@/components/inventario/RevisionRealizarDialog.vue';
import RevisionCancelarDialog from '@/components/inventario/RevisionCancelarDialog.vue';

const EMPTY = '—';

const props = defineProps<{
  id: number;
}>();

// `changed` avisa de que una revisión se creó, cambió o eliminó: la ficha debe recargarse.
const emit = defineEmits<{
  changed: [];
}>();

const $q = useQuasar();
const { t, locale } = useI18n();
const auth = useAuthStore();
const revisionesStore = useRevisionesStore();
const auxiliares = useAuxiliaresInventarioStore();

const canView = computed(() => auth.hasPermission('mantenimiento_revisiones.ver'));

const canCreate = computed(() => auth.hasPermission('mantenimiento_revisiones.crear'));
const canEdit = computed(() => auth.hasPermission('mantenimiento_revisiones.editar'));
const canDelete = computed(() => auth.hasPermission('mantenimiento_revisiones.eliminar'));

const dialogVisible = ref(false);
const editingRevision = ref<Revision | null>(null);
const realizarVisible = ref(false);
const cancelarVisible = ref(false);
const actionRevision = ref<Revision | null>(null);

const estadoId = ref<number | null>(null);
const prioridadId = ref<number | null>(null);
const estadoOptions = ref<{ label: string; value: number }[]>([]);
const prioridadOptions = ref<{ label: string; value: number }[]>([]);
const errorMessage = ref<string | null>(null);

const pagination = ref({ page: 1, rowsPerPage: 15, rowsNumber: 0 });

const loadingAttrs = useDelayedLoading(() => revisionesStore.loading);

// Una respuesta tardía se descarta si ya se lanzó otra petición o cambió el elemento.
let requestSeq = 0;

function formatDate(value: string | null): string {
  if (!value) return EMPTY;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale.value);
}

function formatCoste(value: number | null): string {
  if (value == null) return EMPTY;
  return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'EUR' }).format(value);
}

function estadoColor(id: number): string {
  if (id === REVISION_ESTADO.REALIZADA) return 'green-8';
  if (id === REVISION_ESTADO.CANCELADA) return 'grey-7';
  return 'orange-8';
}

const columns = computed<QTableColumn<Revision>[]>(() => {
  const base: QTableColumn<Revision>[] = [
    {
      name: 'nombre',
      label: t('inventarioRevisiones.columns.nombre'),
      field: (row) => row.nombre ?? EMPTY,
      align: 'left',
    },
    {
      name: 'fechaRevision',
      label: t('inventarioRevisiones.columns.fechaRevision'),
      field: (row) => formatDate(row.fechaRevision),
      align: 'left',
    },
    {
      name: 'fechaProximaRevision',
      label: t('inventarioRevisiones.columns.fechaProximaRevision'),
      field: (row) => formatDate(row.fechaProximaRevision),
      align: 'left',
    },
    {
      name: 'prioridad',
      label: t('inventarioRevisiones.columns.prioridad'),
      field: (row) => row.prioridad?.descripcion ?? EMPTY,
      align: 'left',
    },
    {
      name: 'estado',
      label: t('inventarioRevisiones.columns.estado'),
      field: 'estadoId',
      align: 'left',
    },
    {
      name: 'coste',
      label: t('inventarioRevisiones.columns.coste'),
      field: (row) => formatCoste(row.coste),
      align: 'right',
    },
  ];
  return canEdit.value || canDelete.value
    ? [
        ...base,
        {
          name: 'acciones',
          label: t('inventarioRevisiones.columns.actions'),
          field: 'id',
          align: 'center',
        },
      ]
    : base;
});

async function load(page: number, perPage: number) {
  const seq = ++requestSeq;
  errorMessage.value = null;
  try {
    await revisionesStore.fetchRevisiones({
      elemInventarioId: props.id,
      page,
      perPage,
      ...(estadoId.value != null ? { estadoId: estadoId.value } : {}),
      ...(prioridadId.value != null ? { prioridadId: prioridadId.value } : {}),
    });
    if (seq !== requestSeq) return;
    const meta = revisionesStore.meta;
    pagination.value = {
      page: meta.currentPage,
      rowsPerPage: meta.perPage,
      rowsNumber: meta.total,
    };
  } catch (error) {
    if (seq !== requestSeq) return;
    errorMessage.value = getApiErrorMessage(error, t('inventarioRevisiones.fetchError'));
  }
}

function reload() {
  return load(pagination.value.page, pagination.value.rowsPerPage);
}

function onRequest(requestProps: { pagination: { page: number; rowsPerPage: number } }) {
  const { page, rowsPerPage } = requestProps.pagination;
  return load(page, rowsPerPage);
}

function openCreate() {
  editingRevision.value = null;
  dialogVisible.value = true;
}

function openEdit(row: Revision) {
  editingRevision.value = row;
  dialogVisible.value = true;
}

function openRealizar(row: Revision) {
  actionRevision.value = row;
  realizarVisible.value = true;
}

function openCancelar(row: Revision) {
  actionRevision.value = row;
  cancelarVisible.value = true;
}

// Tras guardar se recarga la página actual (una revisión nueva cae donde la ordene el servidor).
function onSaved() {
  emit('changed');
  void reload();
}

function onDeleteConfirm(row: Revision) {
  $q.dialog({
    title: t('inventarioRevisiones.deleteDialogTitle'),
    message: t('inventarioRevisiones.deleteDialogMessage', {
      name: row.nombre ?? formatDate(row.fechaRevision),
    }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: Revision) {
  try {
    await revisionesStore.deleteRevision(row.id);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('inventarioRevisiones.deleteSuccess'),
    });
    // Si era la única fila de una página posterior a la primera, se retrocede una página.
    const { page, rowsPerPage } = pagination.value;
    const wasLastOnPage = revisionesStore.items.length === 1 && page > 1;
    emit('changed');
    await load(wasLastOnPage ? page - 1 : page, rowsPerPage);
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('inventarioRevisiones.deleteError')),
    });
  }
}

function onFilterChange() {
  return load(1, pagination.value.rowsPerPage);
}

// Los catálogos se cargan al abrir la pestaña; si fallan, los filtros quedan vacíos.
async function loadCatalogos() {
  try {
    const [estados, prioridades] = await Promise.all([
      auxiliares.fetchEstadosRevisionMant(),
      auxiliares.fetchPrioridadesRevisionMant(),
    ]);
    estadoOptions.value = estados.map((o) => ({ label: o.descripcion, value: o.id }));
    prioridadOptions.value = prioridades.map((o) => ({ label: o.descripcion, value: o.id }));
  } catch {
    estadoOptions.value = [];
    prioridadOptions.value = [];
  }
}

// El componente se monta al activar la carpeta y keep-alive evita repetir la petición.
// Sin permiso no se hace ninguna petición.
watch(
  () => [props.id, canView.value] as const,
  ([, allowed]) => {
    requestSeq++;
    errorMessage.value = null;
    estadoId.value = null;
    prioridadId.value = null;
    revisionesStore.items = [];
    pagination.value = { page: 1, rowsPerPage: pagination.value.rowsPerPage, rowsNumber: 0 };
    if (!allowed) return;
    void loadCatalogos();
    void load(1, pagination.value.rowsPerPage);
  },
  { immediate: true },
);
</script>
