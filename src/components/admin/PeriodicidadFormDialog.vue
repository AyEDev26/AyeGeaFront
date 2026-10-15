<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{
            isEditMode
              ? t('admin.periodicidadForm.editTitle')
              : t('admin.periodicidadForm.createTitle')
          }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-input
            v-model="descripcion"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.periodicidadForm.descripcionLabel')"
            :rules="descripcionRules"
            lazy-rules
          />
          <q-input
            v-model="meses"
            type="number"
            min="0"
            step="1"
            outlined
            dense
            class="elegant-input"
            :label="t('admin.periodicidadForm.mesesLabel')"
            :hint="t('admin.periodicidadForm.mesesHint')"
            :rules="mesesRules"
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
import {
  usePeriodicidadesStore,
  type Periodicidad,
  type PeriodicidadPayload,
} from '@/stores/periodicidades';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  periodicidad: Periodicidad | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const periodicidadesStore = usePeriodicidadesStore();

const isEditMode = computed(() => props.periodicidad !== null);

const formRef = ref<QForm | null>(null);
const descripcion = ref('');
// q-input type="number" puede devolver string o null al vaciarse.
const meses = ref<string | number | null>(null);
const saving = ref(false);

const descripcionRules = [
  (val: string) => !!val?.trim() || t('admin.periodicidadForm.descripcionRequired'),
  (val: string) => val.length <= 45 || t('admin.periodicidadForm.descripcionTooLong'),
];
const mesesRules = [
  (val: string | number | null) =>
    (val !== null && val !== undefined && String(val).trim() !== '') ||
    t('admin.periodicidadForm.mesesRequired'),
  (val: string | number | null) =>
    /^\d+$/.test(String(val ?? '').trim()) || t('admin.periodicidadForm.mesesInvalid'),
];

function resetForm() {
  descripcion.value = props.periodicidad?.descripcion ?? '';
  meses.value = props.periodicidad?.meses ?? null;
  formRef.value?.resetValidation();
}

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

function onHide() {
  saving.value = false;
}

function buildPayload(): PeriodicidadPayload {
  return {
    descripcion: descripcion.value.trim(),
    meses: parseInt(String(meses.value).trim(), 10),
  };
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) {
    return;
  }

  saving.value = true;
  try {
    const payload = buildPayload();
    if (isEditMode.value && props.periodicidad) {
      await periodicidadesStore.updatePeriodicidad(props.periodicidad.id, payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.periodicidadForm.updated'),
      });
    } else {
      await periodicidadesStore.createPeriodicidad(payload);
      $q.notify({
        type: 'positive',
        color: 'teal-9',
        message: t('admin.periodicidadForm.created'),
      });
    }
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('admin.periodicidadForm.saveError')),
    });
  } finally {
    saving.value = false;
  }
}
</script>
