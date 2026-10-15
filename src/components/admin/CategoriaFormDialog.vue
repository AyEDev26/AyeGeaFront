<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{
            isEditMode ? t('admin.categoriaForm.editTitle') : t('admin.categoriaForm.createTitle')
          }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
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
            :rules="tipoRules"
            lazy-rules
          />
          <q-input
            v-model="nombre"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.categoriaForm.nombreLabel')"
            :rules="nombreRules"
            lazy-rules
          />
          <q-input
            v-model="prefijo"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.categoriaForm.prefijoLabel')"
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
import { useCategoriasStore, type Categoria, type CategoriaPayload } from '@/stores/categorias';
import { useTiposElementoStore } from '@/stores/tiposElemento';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  categoria: Categoria | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const categoriasStore = useCategoriasStore();
const tiposStore = useTiposElementoStore();

const isEditMode = computed(() => props.categoria !== null);

const formRef = ref<QForm | null>(null);
const tipoId = ref<number | null>(null);
const nombre = ref('');
const prefijo = ref('');
const saving = ref(false);

const tipoRules = [(val: number | null) => val !== null || t('admin.categoriaForm.tipoRequired')];
const nombreRules = [
  (val: string) => !!val?.trim() || t('admin.categoriaForm.nombreRequired'),
  (val: string) => val.length <= 255 || t('admin.categoriaForm.nombreTooLong'),
];
const prefijoRules = [
  (val: string | null) => (val ?? '').length <= 50 || t('admin.categoriaForm.prefijoTooLong'),
];

function resetForm() {
  tipoId.value = props.categoria?.tipoElementoInventarioId ?? null;
  nombre.value = props.categoria?.nombre ?? '';
  prefijo.value = props.categoria?.prefijo ?? '';
  formRef.value?.resetValidation();
}

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
    tiposStore.fetchTipos().catch((error) => {
      $q.notify({
        type: 'negative',
        color: 'red-9',
        message: getApiErrorMessage(error, t('admin.categoriaForm.saveError')),
      });
    });
  }
});

function onHide() {
  saving.value = false;
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
    if (isEditMode.value && props.categoria) {
      await categoriasStore.updateCategoria(props.categoria.id, payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.categoriaForm.updated'),
      });
    } else {
      await categoriasStore.createCategoria(payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.categoriaForm.created'),
      });
    }
    emit('saved');
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
