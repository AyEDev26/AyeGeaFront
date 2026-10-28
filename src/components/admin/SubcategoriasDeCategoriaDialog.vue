<template>
  <q-dialog v-model="visible" @show="loadSubcategorias">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 800px">
      <q-card-section class="row items-center q-pb-none no-wrap">
        <div class="text-h6 text-teal-10 font-outfit ellipsis">
          {{ t('admin.subcategorias.dialogTitle', { name: categoriaNombre }) }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="row justify-end q-mb-md">
          <q-btn
            v-if="auth.hasPermission('catalogos.crear')"
            unelevated
            no-caps
            color="primary"
            icon="add"
            class="elegant-btn"
            :label="t('admin.subcategorias.newButton')"
            @click="openCreate"
          />
        </div>

        <div v-if="errorMessage" class="column items-center q-pa-md q-gutter-y-sm">
          <div class="text-red-9">{{ errorMessage }}</div>
          <q-btn
            flat
            no-caps
            color="primary"
            icon="refresh"
            :label="t('admin.subcategorias.retryButton')"
            @click="loadSubcategorias"
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
          hide-pagination
          :rows-per-page-options="[0]"
          v-bind="loadingAttrs"
        >
          <template #no-data>
            <div class="full-width text-center text-grey-7 q-pa-md">
              {{ t('admin.subcategorias.emptyMessage') }}
            </div>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center q-gutter-x-sm">
              <q-btn
                v-if="auth.hasPermission('documentos.ver')"
                flat
                round
                dense
                size="sm"
                color="primary"
                icon="description"
                @click="openDocumentos(props.row)"
              >
                <q-tooltip>{{ t('documentosAsociados.buttonTooltip') }}</q-tooltip>
              </q-btn>
              <q-btn
                v-if="auth.hasPermission('catalogos.editar')"
                flat
                round
                dense
                size="sm"
                color="primary"
                icon="edit"
                @click="openEdit(props.row)"
              >
                <q-tooltip>{{ t('admin.subcategorias.editTooltip') }}</q-tooltip>
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
                <q-tooltip>{{ t('admin.subcategorias.deleteTooltip') }}</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>

      <SubcategoriaFormDialog
        v-model="formDialogVisible"
        :subcategoria="editingSubcategoria"
        :categoria="{ id: categoriaId, nombre: categoriaNombre }"
        @saved="onSaved"
      />
      <DocumentosAsociadosDialog
        v-model="documentosDialogVisible"
        tipo="subcategoria"
        :id="documentosTarget.id"
        :nombre="documentosTarget.nombre"
      />
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useSubcategoriasStore, type Subcategoria } from '@/stores/subcategorias';
import { useDelayedLoading } from '@/composables/useDelayedLoading';
import { getApiErrorMessage } from '@/utils/api-error';
import SubcategoriaFormDialog from '@/components/admin/SubcategoriaFormDialog.vue';
import DocumentosAsociadosDialog from '@/components/documentos/DocumentosAsociadosDialog.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  categoriaId: number;
  categoriaNombre: string;
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const auth = useAuthStore();
const subcategoriasStore = useSubcategoriasStore();

const rows = ref<Subcategoria[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const pagination = ref({ rowsPerPage: 0 });
const loadingAttrs = useDelayedLoading(() => loading.value);

const columns = computed<QTableColumn<Subcategoria>[]>(() => [
  {
    name: 'nombre',
    label: t('admin.subcategorias.columns.nombre'),
    field: 'nombre',
    align: 'left',
    sortable: true,
  },
  {
    name: 'periodicidad',
    label: t('admin.subcategorias.columns.periodicidad'),
    field: (row) => row.periodicidad?.descripcion ?? '—',
    align: 'left',
    sortable: true,
  },
  {
    name: 'prefijo',
    label: t('admin.subcategorias.columns.prefijo'),
    field: (row) => row.prefijo ?? '—',
    align: 'left',
    sortable: true,
  },
  {
    name: 'actions',
    label: t('admin.subcategorias.columns.actions'),
    field: 'id',
    align: 'center',
  },
]);

// Contador para descartar respuestas tardías de una carga anterior o de otra categoría.
let requestSeq = 0;

async function loadSubcategorias() {
  const seq = ++requestSeq;
  const categoriaId = props.categoriaId;
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await subcategoriasStore.fetchAllSubcategorias({ categoriaId });
    if (seq !== requestSeq || categoriaId !== props.categoriaId) return;
    rows.value = result;
  } catch (error) {
    if (seq !== requestSeq || categoriaId !== props.categoriaId) return;
    rows.value = [];
    errorMessage.value = getApiErrorMessage(error, t('admin.subcategorias.fetchError'));
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

watch(
  () => props.categoriaId,
  () => {
    if (visible.value) void loadSubcategorias();
  },
);

// ------------------------------------------------------------------
// Alta / edición
// ------------------------------------------------------------------

const formDialogVisible = ref(false);
const editingSubcategoria = ref<Subcategoria | null>(null);

function openCreate() {
  editingSubcategoria.value = null;
  formDialogVisible.value = true;
}

function openEdit(row: Subcategoria) {
  editingSubcategoria.value = row;
  formDialogVisible.value = true;
}

function onSaved() {
  formDialogVisible.value = false;
  void loadSubcategorias();
}

// ------------------------------------------------------------------
// Borrado
// ------------------------------------------------------------------

function onDeleteConfirm(row: Subcategoria) {
  $q.dialog({
    title: t('admin.subcategorias.deleteDialogTitle'),
    message: t('admin.subcategorias.deleteDialogMessage', { name: row.nombre }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onDelete(row);
  });
}

async function onDelete(row: Subcategoria) {
  try {
    await subcategoriasStore.deleteSubcategoria(row.id);
    $q.notify({
      type: 'positive',
      color: 'teal-9',
      message: t('admin.subcategorias.deleteSuccess'),
    });
    void loadSubcategorias();
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.subcategorias.deleteError')),
    });
  }
}

// ------------------------------------------------------------------
// Documentos asociados
// ------------------------------------------------------------------

const documentosDialogVisible = ref(false);
const documentosTarget = ref<{ id: number | null; nombre: string }>({ id: null, nombre: '' });

function openDocumentos(row: Subcategoria) {
  documentosTarget.value = { id: row.id, nombre: row.nombre };
  documentosDialogVisible.value = true;
}
</script>
