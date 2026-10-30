<template>
  <AdminPageWrapper wide align-top>
    <GlassCard class="q-pa-md animate__fadeIn" style="min-height: 30vh">
      <div class="row items-center q-mb-md">
        <div class="text-h5 text-weight-bolder text-teal-10 font-outfit">
          {{
            isEditMode ? t('admin.categoriaForm.editTitle') : t('admin.categoriaForm.createTitle')
          }}
        </div>
        <q-space />
        <q-btn
          v-if="isEditMode && categoria && auth.hasPermission('documentos.ver')"
          flat
          no-caps
          color="primary"
          icon="description"
          :label="t('admin.categoriaForm.documentosButton')"
          @click="documentosDialogVisible = true"
        />
      </div>

      <div v-if="loading" class="row justify-center q-pa-xl">
        <q-spinner-dots color="primary" size="40px" />
      </div>

      <div v-else-if="loadError" class="column items-center q-gutter-y-md q-pa-lg">
        <div class="text-red-9">{{ loadError }}</div>
        <div class="row q-gutter-x-sm">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="refresh"
            class="elegant-btn"
            :label="t('admin.categoriaForm.retryButton')"
            @click="loadCategoria"
          />
          <q-btn
            flat
            no-caps
            color="grey-8"
            :label="t('admin.categoriaForm.backToListButton')"
            @click="goToList"
          />
        </div>
      </div>

      <template v-else>
        <div class="text-subtitle1 text-weight-bold text-teal-10 font-outfit q-mb-sm">
          {{ t('admin.categoriaForm.dataSectionTitle') }}
        </div>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-select
                v-model="tipoId"
                outlined
                dense
                emit-value
                map-options
                class="elegant-input"
                option-value="id"
                option-label="descripcion"
                :label="t('admin.categoriaForm.tipoLabel')"
                :options="tiposStore.items"
                :loading="tiposStore.loading"
                :disable="readonly"
                :rules="tipoRules"
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-5">
              <q-input
                v-model="nombre"
                outlined
                dense
                class="elegant-input"
                :label="t('admin.categoriaForm.nombreLabel')"
                :disable="readonly"
                :rules="nombreRules"
                lazy-rules
              />
            </div>
            <div class="col-12 col-md-3">
              <q-input
                v-model="prefijo"
                outlined
                dense
                class="elegant-input"
                :label="t('admin.categoriaForm.prefijoLabel')"
                :disable="readonly"
                :rules="prefijoRules"
                lazy-rules
              />
            </div>
          </div>

          <div class="row justify-end q-gutter-x-sm">
            <q-btn flat no-caps color="grey-7" :label="t('common.cancel')" @click="goToList" />
            <q-btn
              v-if="!readonly"
              unelevated
              no-caps
              color="primary"
              class="elegant-btn px-lg"
              :label="t('common.save')"
              :loading="saving"
              @click="onSubmit"
            />
          </div>
        </q-form>

        <q-separator class="q-my-lg" />

        <div class="row items-center q-mb-sm">
          <div class="text-subtitle1 text-weight-bold text-teal-10 font-outfit">
            {{ t('admin.categoriaForm.subcategoriasSectionTitle') }}
          </div>
          <q-space />
          <q-btn
            v-if="categoria && auth.hasPermission('catalogos.crear')"
            unelevated
            no-caps
            color="primary"
            icon="add"
            class="elegant-btn"
            :label="t('admin.subcategorias.newButton')"
            @click="openSubcategoriaCreate"
          />
        </div>

        <div v-if="!categoria" class="text-grey-7 q-pa-md">
          {{ t('admin.categoriaForm.subcategoriasCreateHint') }}
        </div>

        <div v-else-if="subError" class="column items-center q-pa-md q-gutter-y-sm">
          <div class="text-red-9">{{ subError }}</div>
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
          v-model:pagination="subPagination"
          flat
          bordered
          dense
          class="elegant-table"
          :rows="subRows"
          :columns="subColumns"
          row-key="id"
          hide-pagination
          :rows-per-page-options="[0]"
          v-bind="subLoadingAttrs"
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
                @click="openSubcategoriaDocumentos(props.row)"
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
                @click="openSubcategoriaEdit(props.row)"
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
                @click="onSubcategoriaDeleteConfirm(props.row)"
              >
                <q-tooltip>{{ t('admin.subcategorias.deleteTooltip') }}</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </template>

      <SubcategoriaFormDialog
        v-if="categoria"
        v-model="subFormDialogVisible"
        :subcategoria="editingSubcategoria"
        :categoria="{ id: categoria.id, nombre: categoria.nombre }"
        @saved="onSubcategoriaSaved"
      />
      <DocumentosAsociadosDialog
        v-model="subDocumentosDialogVisible"
        tipo="subcategoria"
        :id="subDocumentosTarget.id"
        :nombre="subDocumentosTarget.nombre"
      />

      <DocumentosAsociadosDialog
        v-if="categoria"
        v-model="documentosDialogVisible"
        tipo="categoria"
        :id="categoria.id"
        :nombre="categoria.nombre"
      />
    </GlassCard>
  </AdminPageWrapper>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, type QForm, type QTableColumn } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useCategoriasStore, type Categoria, type CategoriaPayload } from '@/stores/categorias';
import { useSubcategoriasStore, type Subcategoria } from '@/stores/subcategorias';
import { useTiposElementoStore } from '@/stores/tiposElemento';
import { useDelayedLoading } from '@/composables/useDelayedLoading';
import { getApiErrorMessage } from '@/utils/api-error';
import SubcategoriaFormDialog from '@/components/admin/SubcategoriaFormDialog.vue';
import DocumentosAsociadosDialog from '@/components/documentos/DocumentosAsociadosDialog.vue';
import AdminPageWrapper from '@/components/common/AdminPageWrapper.vue';
import GlassCard from '@/components/common/GlassCard.vue';

const LIST_PATH = '/admin/categorias';

const $q = useQuasar();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const categoriasStore = useCategoriasStore();
const tiposStore = useTiposElementoStore();
const subcategoriasStore = useSubcategoriasStore();

// Modo deducido de la ruta: sin parámetro `id` → alta; con `id` → edición.
const categoriaId = computed(() => {
  const raw = route.params.id;
  return typeof raw === 'string' ? Number(raw) : null;
});
const isEditMode = computed(() => categoriaId.value !== null);
const readonly = computed(() => isEditMode.value && !auth.hasPermission('catalogos.editar'));

const formRef = ref<QForm | null>(null);
const categoria = ref<Categoria | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const saving = ref(false);
const documentosDialogVisible = ref(false);

const tipoId = ref<number | null>(null);
const nombre = ref('');
const prefijo = ref('');

const tipoRules = [(val: number | null) => val !== null || t('admin.categoriaForm.tipoRequired')];
const nombreRules = [
  (val: string) => !!val?.trim() || t('admin.categoriaForm.nombreRequired'),
  (val: string) => val.length <= 255 || t('admin.categoriaForm.nombreTooLong'),
];
const prefijoRules = [
  (val: string | null) => (val ?? '').length <= 50 || t('admin.categoriaForm.prefijoTooLong'),
];

function goToList() {
  void router.push(LIST_PATH);
}

function fillForm(source: Categoria | null) {
  tipoId.value = source?.tipoElementoInventarioId ?? null;
  nombre.value = source?.nombre ?? '';
  prefijo.value = source?.prefijo ?? '';
  formRef.value?.resetValidation();
}

// Contador de petición: ignora respuestas tardías de otra categoría.
let loadRequest = 0;

async function loadCategoria() {
  const id = categoriaId.value;
  const request = ++loadRequest;
  loadError.value = null;

  if (id === null) {
    categoria.value = null;
    resetSubcategorias();
    loading.value = false;
    fillForm(null);
    return;
  }
  if (!Number.isInteger(id) || id <= 0) {
    void router.replace(LIST_PATH);
    return;
  }

  loading.value = true;
  try {
    const loaded = await categoriasStore.fetchCategoria(id);
    if (request !== loadRequest) return;
    categoria.value = loaded;
    fillForm(loaded);
    void loadSubcategorias();
  } catch (error) {
    if (request !== loadRequest) return;
    categoria.value = null;
    resetSubcategorias();
    loadError.value = getApiErrorMessage(error, t('admin.categoriaForm.loadError'));
  } finally {
    if (request === loadRequest) loading.value = false;
  }
}

// Al pasar de /nuevo a /:id tras crear, el componente se reutiliza: se recarga.
watch(categoriaId, () => {
  void loadCategoria();
});

onMounted(() => {
  void loadCategoria();
  tiposStore.fetchTipos().catch((error) => {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.categoriaForm.saveError')),
    });
  });
});

// ------------------------------------------------------------------
// Subcategorías de la categoría
// ------------------------------------------------------------------

const subRows = ref<Subcategoria[]>([]);
const subLoading = ref(false);
const subError = ref('');
const subPagination = ref({ rowsPerPage: 0 });
const subLoadingAttrs = useDelayedLoading(() => subLoading.value);

const subColumns = computed<QTableColumn<Subcategoria>[]>(() => [
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
let subRequest = 0;

function resetSubcategorias() {
  subRequest++;
  subRows.value = [];
  subError.value = '';
  subLoading.value = false;
}

async function loadSubcategorias() {
  const categoriaId = categoria.value?.id;
  if (categoriaId === undefined) return;
  const request = ++subRequest;
  subLoading.value = true;
  subError.value = '';
  try {
    const result = await subcategoriasStore.fetchAllSubcategorias({ categoriaId });
    if (request !== subRequest || categoriaId !== categoria.value?.id) return;
    subRows.value = result;
  } catch (error) {
    if (request !== subRequest || categoriaId !== categoria.value?.id) return;
    subRows.value = [];
    subError.value = getApiErrorMessage(error, t('admin.subcategorias.fetchError'));
  } finally {
    if (request === subRequest) subLoading.value = false;
  }
}

const subFormDialogVisible = ref(false);
const editingSubcategoria = ref<Subcategoria | null>(null);

function openSubcategoriaCreate() {
  editingSubcategoria.value = null;
  subFormDialogVisible.value = true;
}

function openSubcategoriaEdit(row: Subcategoria) {
  editingSubcategoria.value = row;
  subFormDialogVisible.value = true;
}

function onSubcategoriaSaved() {
  subFormDialogVisible.value = false;
  void loadSubcategorias();
}

function onSubcategoriaDeleteConfirm(row: Subcategoria) {
  $q.dialog({
    title: t('admin.subcategorias.deleteDialogTitle'),
    message: t('admin.subcategorias.deleteDialogMessage', { name: row.nombre }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void onSubcategoriaDelete(row);
  });
}

async function onSubcategoriaDelete(row: Subcategoria) {
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

const subDocumentosDialogVisible = ref(false);
const subDocumentosTarget = ref<{ id: number | null; nombre: string }>({ id: null, nombre: '' });

function openSubcategoriaDocumentos(row: Subcategoria) {
  subDocumentosTarget.value = { id: row.id, nombre: row.nombre };
  subDocumentosDialogVisible.value = true;
}

// Los strings vacíos nunca se envían: en edición el prefijo vaciado va como null;
// en alta se omite.
function buildPayload(): CategoriaPayload {
  const payload: CategoriaPayload = {
    tipo_elemento_inventario_id: tipoId.value as number,
    nombre: nombre.value.trim(),
  };
  const prefijoValue = (prefijo.value ?? '').trim();
  if (isEditMode.value) {
    payload.prefijo = prefijoValue || null;
  } else if (prefijoValue) {
    payload.prefijo = prefijoValue;
  }
  return payload;
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    return;
  }

  saving.value = true;
  try {
    const payload = buildPayload();
    if (isEditMode.value && categoria.value) {
      await categoriasStore.updateCategoria(categoria.value.id, payload);
      categoria.value = await categoriasStore.fetchCategoria(categoria.value.id);
      fillForm(categoria.value);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.categoriaForm.updated') });
    } else {
      const created = await categoriasStore.createCategoria(payload);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('admin.categoriaForm.created') });
      await router.replace(`${LIST_PATH}/${created.id}`);
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.categoriaForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
