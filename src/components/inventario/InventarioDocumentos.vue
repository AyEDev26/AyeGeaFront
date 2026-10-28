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
      </div>

      <q-table
        flat
        bordered
        dense
        class="elegant-table"
        :rows="section.rows"
        :columns="columns"
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
      </q-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useDelayedLoading } from '@/composables/useDelayedLoading';
import { useAuthStore } from '@/stores/auth';
import { useDocumentosStore, type Documento, type DocumentoOrigen } from '@/stores/documentos';
import { getApiErrorMessage } from '@/utils/api-error';

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

const canView = computed(() => auth.hasPermission('documentos.ver'));

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

const loadingAttrs = useDelayedLoading(() => loading.value);
</script>
