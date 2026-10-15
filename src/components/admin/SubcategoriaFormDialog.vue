<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{
            isEditMode
              ? t('admin.subcategoriaForm.editTitle')
              : t('admin.subcategoriaForm.createTitle')
          }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-select
            v-model="categoriaId"
            outlined
            dense
            emit-value
            map-options
            class="elegant-input"
            option-value="id"
            option-label="nombre"
            :label="t('admin.subcategoriaForm.categoriaLabel')"
            :options="categoriaOptions"
            :loading="loadingOptions"
            :rules="categoriaRules"
            lazy-rules
          />
          <q-input
            v-model="nombre"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.subcategoriaForm.nombreLabel')"
            :rules="nombreRules"
            lazy-rules
          />
          <q-select
            v-model="periodicidadId"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="elegant-input"
            option-value="id"
            option-label="descripcion"
            :label="t('admin.subcategoriaForm.periodicidadLabel')"
            :options="periodicidadOptions"
            :loading="loadingOptions"
          />
          <q-input
            v-model="prefijo"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.subcategoriaForm.prefijoLabel')"
            :rules="prefijoRules"
            lazy-rules
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps color="grey-7" :label="t('common.cancel')" v-close-popup />
        <q-btn
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
import { useCategoriasStore, type Categoria } from '@/stores/categorias';
import {
  useSubcategoriasStore,
  type PeriodicidadOption,
  type Subcategoria,
  type SubcategoriaPayload,
} from '@/stores/subcategorias';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  subcategoria: Subcategoria | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const categoriasStore = useCategoriasStore();
const subcategoriasStore = useSubcategoriasStore();

const isEditMode = computed(() => props.subcategoria !== null);

const formRef = ref<QForm | null>(null);
const categoriaId = ref<number | null>(null);
const nombre = ref('');
const periodicidadId = ref<number | null>(null);
const prefijo = ref('');
const saving = ref(false);

const categoriaOptions = ref<Categoria[]>([]);
const periodicidadOptions = ref<PeriodicidadOption[]>([]);
const loadingOptions = ref(false);

const categoriaRules = [
  (val: number | null) => val !== null || t('admin.subcategoriaForm.categoriaRequired'),
];
const nombreRules = [
  (val: string) => !!val?.trim() || t('admin.subcategoriaForm.nombreRequired'),
  (val: string) => val.length <= 50 || t('admin.subcategoriaForm.nombreTooLong'),
];
const prefijoRules = [
  (val: string | null) => (val ?? '').length <= 3 || t('admin.subcategoriaForm.prefijoTooLong'),
];

function resetForm() {
  categoriaId.value = props.subcategoria?.categoriaId ?? null;
  nombre.value = props.subcategoria?.nombre ?? '';
  periodicidadId.value = props.subcategoria?.periodicidadId ?? null;
  prefijo.value = props.subcategoria?.prefijo ?? '';
  formRef.value?.resetValidation();
}

// Las opciones se recargan al abrir para reflejar categorías creadas o borradas.
// Un fallo en periodicidades no bloquea el diálogo: lista vacía con aviso.
async function loadOptions() {
  loadingOptions.value = true;
  try {
    const [categorias, periodicidades] = await Promise.allSettled([
      categoriasStore.fetchAllCategorias(),
      subcategoriasStore.fetchPeriodicidadOptions(),
    ]);
    if (categorias.status === 'fulfilled') {
      categoriaOptions.value = categorias.value;
    } else {
      categoriaOptions.value = [];
      $q.notify({
        type: 'negative',
        color: 'red-9',
        message: getApiErrorMessage(
          categorias.reason,
          t('admin.subcategoriaForm.categoriasFetchError'),
        ),
      });
    }
    if (periodicidades.status === 'fulfilled') {
      periodicidadOptions.value = periodicidades.value;
    } else {
      periodicidadOptions.value = [];
      $q.notify({
        type: 'warning',
        message: t('admin.subcategoriaForm.periodicidadesFetchWarning'),
      });
    }
  } finally {
    loadingOptions.value = false;
  }
}

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
    void loadOptions();
  }
});

function onHide() {
  saving.value = false;
}

// Los strings vacíos nunca se envían: en edición los opcionales vaciados van como null;
// en alta se omiten.
function buildPayload(): SubcategoriaPayload {
  const payload: SubcategoriaPayload = {
    categoria_id: categoriaId.value as number,
    nombre: nombre.value.trim(),
  };
  const prefijoValue = (prefijo.value ?? '').trim();
  if (isEditMode.value) {
    payload.periodicidad_id = periodicidadId.value ?? null;
    payload.prefijo = prefijoValue || null;
  } else {
    if (periodicidadId.value !== null) payload.periodicidad_id = periodicidadId.value;
    if (prefijoValue) payload.prefijo = prefijoValue;
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
    if (isEditMode.value && props.subcategoria) {
      await subcategoriasStore.updateSubcategoria(props.subcategoria.id, payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.subcategoriaForm.updated'),
      });
    } else {
      await subcategoriasStore.createSubcategoria(payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.subcategoriaForm.created'),
      });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.subcategoriaForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
