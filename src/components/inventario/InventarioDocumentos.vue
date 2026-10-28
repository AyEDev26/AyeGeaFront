<template>
  <div v-if="!canView" class="text-grey-7 text-center q-py-lg">
    <q-icon name="lock" size="sm" class="q-mr-xs" />
    {{ t('inventarioDocumentos.noAccess') }}
  </div>

  <div v-else-if="errorMessage" class="column items-center q-gutter-y-sm q-py-md">
    <div class="text-red-9 text-center">{{ errorMessage }}</div>
    <q-btn
      flat
      no-caps
      color="primary"
      icon="refresh"
      :label="t('documentosAsociados.retry')"
      @click="load"
    />
  </div>

  <div v-else class="column q-gutter-y-lg">
    <section v-for="section in sections" :key="section.origen">
      <div class="row items-center q-mb-sm no-wrap">
        <q-icon :name="section.icon" color="teal-8" size="sm" class="q-mr-sm" />
        <div class="text-subtitle1 text-weight-bold text-teal-10 font-outfit">
          {{ t(`inventarioDocumentos.sections.${section.origen}`) }}
        </div>
        <q-badge
          v-if="loaded"
          rounded
          color="teal-7"
          text-color="white"
          class="q-ml-sm"
          :label="section.rows.length"
        />
        <q-space />
        <q-btn
          v-if="section.origen === 'elemento' && canCreate"
          unelevated
          no-caps
          dense
          color="primary"
          icon="add"
          class="elegant-btn px-md"
          :label="t('inventarioDocumentos.addButton')"
          :loading="openingDialog"
          @click="openCreate"
        />
      </div>

      <q-table
        flat
        bordered
        dense
        class="elegant-table"
        :rows="section.rows"
        :columns="section.origen === 'elemento' ? elementoColumns : columns"
        row-key="id"
        hide-pagination
        :rows-per-page-options="[0]"
        :no-data-label="t('inventarioDocumentos.empty')"
        :hide-no-data="!loaded"
        v-bind="loadingAttrs"
      >
        <template #body-cell-fechaCaducidad="cell">
          <q-td :props="cell">
            <q-chip
              v-if="cell.row.fechaCaducidad"
              square
              class="q-ma-none text-weight-medium"
              :color="cell.row.caducado ? 'red-9' : 'green-8'"
              text-color="white"
              :title="cell.row.caducado ? t('documentos.expired') : undefined"
            >
              {{ formatDate(cell.row.fechaCaducidad) }}
            </q-chip>
            <template v-else>{{ formatDate(cell.row.fechaCaducidad) }}</template>
          </q-td>
        </template>

        <template #body-cell-descarga="cell">
          <q-td :props="cell" class="text-center">
            <q-btn
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="download"
              @click="onDownload(cell.row)"
            >
              <q-tooltip>{{ t('documentos.downloadTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #body-cell-acciones="cell">
          <q-td :props="cell" class="text-center q-gutter-x-sm">
            <q-btn
              v-if="canEdit"
              flat
              round
              dense
              size="sm"
              color="primary"
              icon="edit"
              @click="openEdit(cell.row)"
            >
              <q-tooltip>{{ t('inventarioDocumentos.editTooltip') }}</q-tooltip>
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
              <q-tooltip>{{ t('inventarioDocumentos.deleteTooltip') }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </section>

    <DocumentoFormDialog
      v-if="elementoContext"
      v-model="dialogVisible"
      :documento="editingDocumento"
      :tipo-options="tipoOptions"
      :categoria-options="[]"
      :subcategoria-options="[]"
      :elemento="elementoContext"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useDelayedLoading } from '@/composables/useDelayedLoading';
import { useAuthStore } from '@/stores/auth';
import {
  useDocumentosStore,
  type Documento,
  type DocumentoOrigen,
  type ElementoContext,
} from '@/stores/documentos';
import { useElemsInventarioStore } from '@/stores/elemsInventario';
import { useTiposDocumentoStore } from '@/stores/tiposDocumento';
import { getApiErrorMessage } from '@/utils/api-error';
import DocumentoFormDialog from '@/components/documentos/DocumentoFormDialog.vue';

const EMPTY = '—';

// Orden fijo de las secciones (de lo más concreto a lo más general).
const ORIGENES: { origen: DocumentoOrigen; icon: string }[] = [
  { origen: 'elemento', icon: 'inventory_2' },
  { origen: 'subcategoria', icon: 'account_tree' },
  { origen: 'categoria', icon: 'category' },
];

const props = defineProps<{
  id: number;
}>();

const $q = useQuasar();
const { t, locale } = useI18n();
const documentosStore = useDocumentosStore();
const auth = useAuthStore();
const elemsStore = useElemsInventarioStore();
const tiposDocumentoStore = useTiposDocumentoStore();

const canView = computed(() => auth.hasPermission('documentos.ver'));
const canCreate = computed(() => auth.hasPermission('documentos.crear'));

const canEdit = computed(() => auth.hasPermission('documentos.editar'));
const canDelete = computed(() => auth.hasPermission('documentos.eliminar'));

const editingDocumento = ref<Documento | null>(null);
const dialogVisible = ref(false);
const openingDialog = ref(false);
const elementoContext = ref<ElementoContext | null>(null);
const tipoOptions = ref<{ label: string; value: number }[]>([]);

const rows = ref<Documento[]>([]);
const loading = ref(false);
// Hasta que termina la primera carga no se muestra "Sin documentos" (evita el parpadeo).
const loaded = ref(false);
const errorMessage = ref<string | null>(null);

// Contador de petición: una respuesta tardía se descarta si ya se lanzó otra
// o si el componente apunta a otro elemento.
let requestSeq = 0;

// Un `origen` ausente o desconocido no encaja en ninguna sección y se ignora.
const sections = computed(() =>
  ORIGENES.map(({ origen, icon }) => ({
    origen,
    icon,
    rows: rows.value.filter((row) => row.origen === origen),
  })),
);

function formatDate(value: string | null): string {
  if (!value) return EMPTY;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale.value);
}

const columns = computed<QTableColumn<Documento>[]>(() => [
  {
    name: 'titulo',
    label: t('documentosAsociados.columns.titulo'),
    field: 'descripcion',
    align: 'left',
  },
  {
    name: 'fechaCaducidad',
    label: t('documentosAsociados.columns.fechaCaducidad'),
    field: 'fechaCaducidad',
    align: 'left',
  },
  {
    name: 'descarga',
    label: t('documentosAsociados.columns.descarga'),
    field: 'id',
    align: 'center',
  },
]);

// Solo la tabla de la sección Elemento lleva columna de acciones.
const elementoColumns = computed<QTableColumn<Documento>[]>(() =>
  canEdit.value || canDelete.value
    ? [
        ...columns.value,
        {
          name: 'acciones',
          label: t('inventarioDocumentos.columns.actions'),
          field: 'id',
          align: 'center',
        },
      ]
    : columns.value,
);

async function load() {
  const seq = ++requestSeq;
  loading.value = true;
  errorMessage.value = null;
  try {
    const result = await documentosStore.fetchDocumentosDeElemento(props.id);
    if (seq !== requestSeq) return;
    rows.value = result;
  } catch (error) {
    if (seq !== requestSeq) return;
    errorMessage.value = getApiErrorMessage(error, t('inventarioDocumentos.fetchError'));
  } finally {
    if (seq === requestSeq) {
      loading.value = false;
      loaded.value = true;
    }
  }
}

// El componente solo se monta al activar la carpeta (carga perezosa) y keep-alive evita
// repetir la petición al volver. Se recarga únicamente si cambia el elemento.
watch(
  () => [props.id, canView.value] as const,
  ([, allowed]) => {
    requestSeq++;
    rows.value = [];
    errorMessage.value = null;
    loading.value = false;
    loaded.value = false;
    if (allowed) void load();
  },
  { immediate: true },
);

async function onDownload(row: Documento) {
  try {
    await documentosStore.downloadDocumento(row);
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('documentos.downloadError')),
    });
  }
}

// Categoría/subcategoría del elemento y tipos de documento se cargan al abrir el diálogo.
function openCreate() {
  return openDialog(null);
}

function openEdit(row: Documento) {
  return openDialog(row);
}

async function openDialog(documento: Documento | null) {
  openingDialog.value = true;
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
    editingDocumento.value = documento;
    // Si el diálogo se monta ahora, debe nacer cerrado para que su watch de apertura reinicie el formulario.
    await nextTick();
    dialogVisible.value = true;
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('inventarioDocumentos.elementoFetchError')),
    });
  } finally {
    openingDialog.value = false;
  }
}

async function onSaved() {
  dialogVisible.value = false;
  await load();
}

function onDeleteConfirm(row: Documento) {
  $q.dialog({
    title: t('inventarioDocumentos.deleteDialogTitle'),
    message: t('inventarioDocumentos.deleteDialogMessage', { name: row.descripcion }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: Documento) {
  try {
    await documentosStore.deleteDocumento(row.id, { refresh: false });
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('inventarioDocumentos.deleteSuccess'),
    });
    await load();
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('inventarioDocumentos.deleteError')),
    });
  }
}

const loadingAttrs = useDelayedLoading(() => loading.value);
</script>
