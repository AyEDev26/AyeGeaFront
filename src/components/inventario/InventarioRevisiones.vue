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

      <template #body-cell-documento="cell">
        <q-td :props="cell">
          <q-btn
            v-if="cell.row.documento"
            flat
            dense
            no-caps
            size="sm"
            color="primary"
            icon="attach_file"
            class="text-left"
            :label="cell.row.documento.descripcion"
            :loading="downloadingId === cell.row.documento.id"
            @click="onDownload(cell.row.documento.id)"
          />
          <span v-else>{{ EMPTY }}</span>
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
            v-if="canAttach"
            flat
            round
            dense
            size="sm"
            color="primary"
            :icon="cell.row.documento ? 'swap_horiz' : 'attach_file'"
            :loading="openingDocumento && documentoRevision?.id === cell.row.id"
            @click="openDocumento(cell.row)"
          >
            <q-tooltip>
              {{
                cell.row.documento
                  ? t('inventarioRevisiones.replaceDocumentoTooltip')
                  : t('inventarioRevisiones.attachDocumentoTooltip')
              }}
            </q-tooltip>
          </q-btn>
          <q-btn
            v-if="canEdit && cell.row.documento"
            flat
            round
            dense
            size="sm"
            color="warning"
            icon="link_off"
            @click="onUnlinkConfirm(cell.row)"
          >
            <q-tooltip>{{ t('inventarioRevisiones.unlinkDocumentoTooltip') }}</q-tooltip>
          </q-btn>
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
    <DocumentoFormDialog
      v-if="elementoContext"
      v-model="documentoDialogVisible"
      :documento="null"
      :tipo-options="tipoOptions"
      :categoria-options="[]"
      :subcategoria-options="[]"
      :elemento="elementoContext"
      @saved="onDocumentoSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useDelayedLoading } from '@/composables/useDelayedLoading';
import { useAuthStore } from '@/stores/auth';
import { useDocumentosStore, type Documento, type ElementoContext } from '@/stores/documentos';
import { useElemsInventarioStore } from '@/stores/elemsInventario';
import { useTiposDocumentoStore } from '@/stores/tiposDocumento';
import { useAuxiliaresInventarioStore } from '@/stores/auxiliaresInventario';
import { REVISION_ESTADO, useRevisionesStore, type Revision } from '@/stores/revisiones';
import { getApiErrorMessage } from '@/utils/api-error';
import DocumentoFormDialog from '@/components/documentos/DocumentoFormDialog.vue';
import RevisionFormDialog from '@/components/inventario/RevisionFormDialog.vue';
import RevisionRealizarDialog from '@/components/inventario/RevisionRealizarDialog.vue';
import RevisionCancelarDialog from '@/components/inventario/RevisionCancelarDialog.vue';

const EMPTY = '—';

const props = defineProps<{
  id: number;
}>();

// `changed` avisa de que una revisión se creó, cambió o eliminó: la ficha debe recargarse.
// `documentoChanged` avisa de que un documento se asoció o eliminó: la carpeta «Documentos» debe recargarse.
const emit = defineEmits<{
  changed: [];
  documentoChanged: [];
}>();

const $q = useQuasar();
const { t, locale } = useI18n();
const auth = useAuthStore();
const revisionesStore = useRevisionesStore();
const auxiliares = useAuxiliaresInventarioStore();
const documentosStore = useDocumentosStore();
const elemsStore = useElemsInventarioStore();
const tiposDocumentoStore = useTiposDocumentoStore();

const canView = computed(() => auth.hasPermission('mantenimiento_revisiones.ver'));

const canCreate = computed(() => auth.hasPermission('mantenimiento_revisiones.crear'));
const canEdit = computed(() => auth.hasPermission('mantenimiento_revisiones.editar'));
const canDelete = computed(() => auth.hasPermission('mantenimiento_revisiones.eliminar'));
const canViewDocumento = computed(() => auth.hasPermission('documentos.ver'));
const canDeleteDocumento = computed(() => auth.hasPermission('documentos.eliminar'));
const canAttach = computed(() => canEdit.value && auth.hasPermission('documentos.crear'));

const dialogVisible = ref(false);
const editingRevision = ref<Revision | null>(null);
const realizarVisible = ref(false);
const cancelarVisible = ref(false);
const actionRevision = ref<Revision | null>(null);
const documentoDialogVisible = ref(false);
const openingDocumento = ref(false);
const documentoRevision = ref<Revision | null>(null);
const elementoContext = ref<ElementoContext | null>(null);
const tipoOptions = ref<{ label: string; value: number }[]>([]);

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
  if (canViewDocumento.value) {
    base.push({
      name: 'documento',
      label: t('inventarioRevisiones.columns.documento'),
      field: (row) => row.documento?.descripcion ?? EMPTY,
      align: 'left',
    });
  }
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

const downloadingId = ref<number | null>(null);

// `documento` de la revisión no trae el nombre original: se consulta antes de descargar.
async function onDownload(documentoId: number) {
  downloadingId.value = documentoId;
  try {
    const documento = await documentosStore.fetchDocumento(documentoId);
    await documentosStore.downloadDocumento(documento);
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('documentos.downloadError')),
    });
  } finally {
    downloadingId.value = null;
  }
}

// Elemento (categoría/subcategoría) y tipos de documento se cargan al abrir el diálogo.
async function openDocumento(row: Revision) {
  openingDocumento.value = true;
  documentoRevision.value = row;
  try {
    const [elem, tipos] = await Promise.all([
      elemsStore.fetchElem(props.id),
      tiposDocumentoStore.fetchAllTiposDocumento(),
    ]);
    elementoContext.value = {
      id: elem.id,
      categoria: elem.categoria,
      subcategoria: elem.subcategoria,
    };
    tipoOptions.value = tipos.map((tipo) => ({ label: tipo.descripcion, value: tipo.id }));
    // Si el diálogo se monta ahora, debe nacer cerrado para que su watch reinicie el formulario.
    await nextTick();
    documentoDialogVisible.value = true;
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('inventarioRevisiones.documentoElementoFetchError')),
    });
  } finally {
    openingDocumento.value = false;
  }
}

// El documento ya está subido: si falla la asociación, se avisa y el documento queda en «Documentos».
async function onDocumentoSaved(documento?: Documento) {
  documentoDialogVisible.value = false;
  const revision = documentoRevision.value;
  if (!documento || !revision) return;
  const previous = revision.documento;
  try {
    await revisionesStore.setDocumentoRevision(revision.id, documento.id);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('inventarioRevisiones.documentoAttachSuccess'),
    });
    emit('changed');
    emit('documentoChanged');
    await reload();
    if (previous) offerDeletePrevious(previous.id);
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('inventarioRevisiones.documentoAttachError')),
    });
  }
}

function onUnlinkConfirm(row: Revision) {
  $q.dialog({
    title: t('inventarioRevisiones.unlinkDialogTitle'),
    message: t('inventarioRevisiones.unlinkDialogMessage', {
      name: row.documento?.descripcion ?? '',
    }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onUnlink(row);
  });
}

async function onUnlink(row: Revision) {
  const previous = row.documento;
  try {
    await revisionesStore.setDocumentoRevision(row.id, null);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('inventarioRevisiones.unlinkSuccess'),
    });
    emit('changed');
    emit('documentoChanged');
    await reload();
    if (previous) offerDeletePrevious(previous.id);
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('inventarioRevisiones.unlinkError')),
    });
  }
}

// El documento anterior se conserva por defecto; solo se ofrece borrarlo con `documentos.eliminar`.
function offerDeletePrevious(documentoId: number) {
  if (!canDeleteDocumento.value) return;
  $q.dialog({
    title: t('inventarioRevisiones.deletePreviousTitle'),
    message: t('inventarioRevisiones.deletePreviousMessage'),
    cancel: { label: t('inventarioRevisiones.deletePreviousKeep'), flat: true },
    ok: { label: t('inventarioRevisiones.deletePreviousConfirm'), color: 'negative' },
    persistent: true,
  }).onOk(() => {
    void deletePrevious(documentoId);
  });
}

async function deletePrevious(documentoId: number) {
  try {
    await documentosStore.deleteDocumento(documentoId, { refresh: false });
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('inventarioRevisiones.deletePreviousSuccess'),
    });
    emit('documentoChanged');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('inventarioRevisiones.deletePreviousError')),
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
