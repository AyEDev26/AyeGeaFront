<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 560px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{ title }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-file
            v-if="!readonly"
            v-model="fichero"
            outlined
            dense
            clearable
            class="elegant-input"
            :label="
              isEditMode ? t('documentoForm.ficheroReplaceLabel') : t('documentoForm.ficheroLabel')
            "
            :hint="t('documentoForm.ficheroHint')"
            :accept="ACCEPT"
            :rules="ficheroRules"
            lazy-rules
          >
            <template #prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>

          <q-input
            v-model="descripcion"
            outlined
            dense
            class="elegant-input"
            :disable="readonly"
            :label="t('documentoForm.descripcionLabel')"
            :rules="descripcionRules"
            lazy-rules
          />

          <q-select
            v-model="tipoDocumentoId"
            outlined
            dense
            emit-value
            map-options
            class="elegant-input"
            :disable="readonly"
            :label="t('documentoForm.tipoLabel')"
            :options="tipoOptions"
            :rules="tipoRules"
            lazy-rules
          />

          <q-input
            v-model="fechaCaducidad"
            outlined
            dense
            :clearable="!readonly"
            type="date"
            stack-label
            class="elegant-input"
            :disable="readonly"
            :label="t('documentoForm.fechaCaducidadLabel')"
          />

          <template v-if="elemento">
            <div>
              <q-toggle
                v-model="flagCategoria"
                :disable="readonly || !elemento.categoria"
                :label="
                  t('documentoForm.flagCategoriaLabel', { name: elemento.categoria?.nombre ?? '—' })
                "
              />
              <div v-if="!elemento.categoria" class="text-caption text-grey-7 q-pl-sm">
                {{ t('documentoForm.flagCategoriaHint') }}
              </div>
            </div>

            <div>
              <q-toggle
                v-model="flagSubcategoria"
                :disable="readonly || !elemento.subcategoria"
                :label="
                  t('documentoForm.flagSubcategoriaLabel', {
                    name: elemento.subcategoria?.nombre ?? '—',
                  })
                "
              />
              <div v-if="!elemento.subcategoria" class="text-caption text-grey-7 q-pl-sm">
                {{ t('documentoForm.flagSubcategoriaHint') }}
              </div>
            </div>
          </template>

          <q-select
            v-if="!elemento"
            v-model="categorias"
            outlined
            dense
            multiple
            use-chips
            emit-value
            map-options
            class="elegant-input documento-multi-select"
            :disable="readonly"
            :label="t('documentoForm.categoriasLabel')"
            :options="categoriaOptions"
          />

          <q-select
            v-if="!elemento"
            v-model="subcategorias"
            outlined
            dense
            multiple
            use-chips
            emit-value
            map-options
            class="elegant-input documento-multi-select"
            :disable="readonly"
            :label="t('documentoForm.subcategoriasLabel')"
            :options="subcategoriaOptions"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          no-caps
          color="grey-7"
          :label="readonly ? t('documentoForm.closeButton') : t('common.cancel')"
          v-close-popup
        />
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
      </q-card-actions>
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useDocumentosStore, type Documento, type ElementoContext } from '@/stores/documentos';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

interface SelectOption {
  label: string;
  value: number;
}

const props = withDefaults(
  defineProps<{
    documento: Documento | null;
    tipoOptions: SelectOption[];
    categoriaOptions: SelectOption[];
    subcategoriaOptions: SelectOption[];
    readonly?: boolean;
    elemento?: ElementoContext | null;
  }>(),
  { readonly: false, elemento: null },
);

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'];
const ACCEPT = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',');
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const $q = useQuasar();
const { t } = useI18n();
const documentosStore = useDocumentosStore();

const isEditMode = computed(() => props.documento !== null);

const title = computed(() => {
  if (props.readonly) return t('documentoForm.viewTitle');
  return isEditMode.value ? t('documentoForm.editTitle') : t('documentoForm.createTitle');
});

const formRef = ref<QForm | null>(null);
const fichero = ref<File | null>(null);
const descripcion = ref('');
const tipoDocumentoId = ref<number | null>(null);
const fechaCaducidad = ref<string | null>(null);
const categorias = ref<number[]>([]);
const subcategorias = ref<number[]>([]);
const flagCategoria = ref(false);
const flagSubcategoria = ref(false);
const saving = ref(false);

const ficheroRules = [
  (val: File | null) => isEditMode.value || !!val || t('documentoForm.ficheroRequired'),
  (val: File | null) => {
    if (!val) return true;
    const ext = val.name.split('.').pop()?.toLowerCase() ?? '';
    return ALLOWED_EXTENSIONS.includes(ext) || t('documentoForm.ficheroInvalidType');
  },
  (val: File | null) => !val || val.size <= MAX_FILE_SIZE || t('documentoForm.ficheroTooLarge'),
];

const descripcionRules = [
  (val: string) => !!val?.trim() || t('documentoForm.descripcionRequired'),
  (val: string) => val.trim().length <= 255 || t('documentoForm.descripcionTooLong'),
];

const tipoRules = [(val: number | null) => val != null || t('documentoForm.tipoRequired')];

function resetForm() {
  fichero.value = null;
  descripcion.value = props.documento?.descripcion ?? '';
  tipoDocumentoId.value = props.documento?.tipoDocumentoId ?? null;
  fechaCaducidad.value = props.documento?.fechaCaducidad ?? null;
  categorias.value = props.documento?.categorias.map((c) => c.id) ?? [];
  subcategorias.value = props.documento?.subcategorias.map((s) => s.id) ?? [];
  flagCategoria.value =
    !!props.elemento?.categoria && categorias.value.includes(props.elemento.categoria.id);
  flagSubcategoria.value =
    !!props.elemento?.subcategoria && subcategorias.value.includes(props.elemento.subcategoria.id);
  formRef.value?.resetValidation();
}

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

// En modo elemento, los flags añaden o quitan solo el id del elemento y se conserva el resto.
function composeIds(current: number[], elementId: number | undefined, flag: boolean): number[] {
  if (!props.elemento || elementId == null) return current;
  const rest = current.filter((id) => id !== elementId);
  return flag ? [...rest, elementId] : rest;
}

function onHide() {
  saving.value = false;
}

async function onSubmit() {
  if (props.readonly) return;
  const isValid = await formRef.value?.validate();
  if (!isValid || tipoDocumentoId.value == null) {
    return;
  }

  const categoriaIds = composeIds(
    categorias.value,
    props.elemento?.categoria?.id,
    flagCategoria.value,
  );
  const subcategoriaIds = composeIds(
    subcategorias.value,
    props.elemento?.subcategoria?.id,
    flagSubcategoria.value,
  );
  // Desde la ficha no se recarga el listado /documentos.
  const writeOptions = props.elemento ? { refresh: false } : {};

  saving.value = true;
  try {
    if (isEditMode.value && props.documento) {
      await documentosStore.updateDocumento(
        props.documento.id,
        {
          descripcion: descripcion.value,
          tipoDocumentoId: tipoDocumentoId.value,
          fechaCaducidad: fechaCaducidad.value,
          categorias: categoriaIds,
          subcategorias: subcategoriaIds,
        },
        writeOptions,
      );
      if (fichero.value) {
        try {
          await documentosStore.replaceFichero(props.documento.id, fichero.value, writeOptions);
        } catch (error) {
          // Los datos ya están guardados: se mantiene el diálogo abierto con el aviso.
          $q.notify({
            type: 'negative',
            color: 'red-9',
            message: getApiErrorMessage(error, t('documentoForm.replaceError')),
          });
          return;
        }
      }
      $q.notify({ type: 'positive', color: 'teal-9', message: t('documentoForm.updated') });
    } else if (fichero.value) {
      await documentosStore.createDocumento(
        {
          fichero: fichero.value,
          descripcion: descripcion.value,
          tipoDocumentoId: tipoDocumentoId.value,
          fechaCaducidad: fechaCaducidad.value,
          categorias: categoriaIds,
          subcategorias: subcategoriaIds,
          ...(props.elemento ? { elemsInventario: [props.elemento.id] } : {}),
        },
        writeOptions,
      );
      $q.notify({ type: 'positive', color: 'teal-9', message: t('documentoForm.created') });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('documentoForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
/* Con chips, el control debe crecer en altura para mostrar todas las selecciones. */
.documento-multi-select :deep(.q-field__control) {
  height: auto;
  min-height: 40px;
}

.documento-multi-select :deep(.q-field__native) {
  flex-wrap: wrap;
  min-height: 38px;
  padding-top: 14px;
  padding-bottom: 4px;
}

.documento-multi-select :deep(.q-field__append) {
  height: auto;
  align-self: stretch;
}
</style>
