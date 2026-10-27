<template>
  <q-dialog v-model="visible" @show="onShow" @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 720px">
      <q-card-section class="row items-center q-pb-none no-wrap">
        <div class="text-h6 text-teal-10 font-outfit ellipsis">
          {{ t('documentosAsociados.title', { name: nombre }) }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div v-if="errorMessage" class="column items-center q-gutter-y-sm q-py-md">
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

        <q-table
          v-else
          v-model:pagination="pagination"
          flat
          bordered
          dense
          class="elegant-table"
          :rows="rows"
          :columns="columns"
          row-key="id"
          :rows-per-page-options="[5, 10, 15]"
          :loading="loading"
          :no-data-label="t('documentosAsociados.empty')"
          :hide-pagination="!loading && pagination.rowsNumber === 0"
          @request="onRequest"
        >
          <template #body-cell-fechaCaducidad="cell">
            <q-td :props="cell">
              <q-chip
                v-if="cell.row.fechaCaducidad && cell.row.caducado"
                dense
                size="sm"
                color="red-9"
                text-color="white"
                :title="t('documentos.expired')"
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
      </q-card-section>

      <q-card-actions v-if="auth.hasPermission('documentos.ver')" align="right">
        <q-btn
          flat
          no-caps
          color="primary"
          icon-right="arrow_forward"
          :label="t('documentosAsociados.manageLink')"
          to="/documentos"
          v-close-popup
        />
      </q-card-actions>
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useDocumentosStore, type Documento } from '@/stores/documentos';
import { useAuthStore } from '@/stores/auth';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const EMPTY = '—';
const DEFAULT_PER_PAGE = 10;

const props = defineProps<{
  tipo: 'categoria' | 'subcategoria';
  id: number | null;
  nombre: string;
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t, locale } = useI18n();
const documentosStore = useDocumentosStore();
const auth = useAuthStore();

const rows = ref<Documento[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const pagination = ref({
  page: 1,
  rowsPerPage: DEFAULT_PER_PAGE,
  rowsNumber: 0,
});

// Contador de petición: una respuesta tardía se descarta si ya se lanzó otra
// (paginación rápida) o si el diálogo apunta a otro id.
let requestSeq = 0;

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
  if (props.id == null) return;
  const seq = ++requestSeq;
  loading.value = true;
  errorMessage.value = null;
  try {
    const relacion =
      props.tipo === 'categoria' ? { categoriaId: props.id } : { subcategoriaId: props.id };
    const result = await documentosStore.fetchDocumentosAsociados(
      relacion,
      pagination.value.page,
      pagination.value.rowsPerPage,
    );
    if (seq !== requestSeq) return;
    rows.value = result.items;
    pagination.value = {
      ...pagination.value,
      page: result.meta.currentPage,
      rowsNumber: result.meta.total,
    };
  } catch (error) {
    if (seq !== requestSeq) return;
    errorMessage.value = getApiErrorMessage(error, t('documentosAsociados.fetchError'));
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function reset() {
  requestSeq++;
  rows.value = [];
  errorMessage.value = null;
  loading.value = false;
  pagination.value = { page: 1, rowsPerPage: DEFAULT_PER_PAGE, rowsNumber: 0 };
}

function onShow() {
  reset();
  void load();
}

function onHide() {
  reset();
}

// Si el diálogo sigue abierto y cambia la fila, se descarta lo anterior y se recarga.
watch(
  () => [props.tipo, props.id],
  () => {
    if (visible.value) onShow();
  },
);

function onRequest(requestProps: { pagination: { page: number; rowsPerPage: number } }) {
  pagination.value = {
    ...pagination.value,
    page: requestProps.pagination.page,
    rowsPerPage: requestProps.pagination.rowsPerPage,
  };
  void load();
}

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
</script>
