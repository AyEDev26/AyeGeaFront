<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 480px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">{{ t('mantenimientoRealizar.title') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <div v-if="mantenimiento?.descripcion" class="text-body2 text-grey-8">
            {{ mantenimiento.descripcion }}
          </div>

          <q-input
            v-model="comentarios"
            outlined
            dense
            autogrow
            type="textarea"
            class="elegant-input"
            :label="t('mantenimientoRealizar.comentariosLabel')"
            :rules="comentariosRules"
            lazy-rules
          />

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="kmsMantenimiento"
                outlined
                dense
                clearable
                type="number"
                min="0"
                class="elegant-input"
                :label="t('mantenimientoRealizar.kmsLabel')"
                :rules="nonNegativeRules"
                lazy-rules
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="horasMantenimiento"
                outlined
                dense
                clearable
                type="number"
                min="0"
                class="elegant-input"
                :label="t('mantenimientoRealizar.horasLabel')"
                :rules="nonNegativeRules"
                lazy-rules
              />
            </div>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps color="grey-7" :label="t('common.cancel')" v-close-popup />
        <q-btn
          unelevated
          no-caps
          color="primary"
          class="elegant-btn px-lg"
          :label="t('mantenimientoRealizar.confirmButton')"
          :loading="saving"
          @click="onSubmit"
        />
      </q-card-actions>
    </GlassCard>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { AxiosError } from 'axios';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useMantenimientosStore, type Mantenimiento } from '@/stores/mantenimientos';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  mantenimiento: Mantenimiento | null;
}>();

// `saved` también se emite ante un 409 (el mantenimiento ya no está Pendiente) para recargar la tabla.
const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const mantenimientosStore = useMantenimientosStore();

const formRef = ref<QForm | null>(null);
const comentarios = ref('');
const kmsMantenimiento = ref<number | null>(null);
const horasMantenimiento = ref<number | null>(null);
const saving = ref(false);

const comentariosRules = [
  (val: string) =>
    (val ?? '').trim().length <= 255 || t('mantenimientoRealizar.comentariosTooLong'),
];
const nonNegativeRules = [
  (val: number | string | null) =>
    val === null || val === '' || Number(val) >= 0 || t('mantenimientoRealizar.nonNegative'),
];

// `clearable` deja el campo en null o en '' según el navegador.
function toNumberOrNull(value: number | string | null): number | null {
  return value === null || value === '' ? null : Number(value);
}

watch(visible, (isVisible) => {
  if (isVisible) {
    comentarios.value = '';
    kmsMantenimiento.value = null;
    horasMantenimiento.value = null;
    formRef.value?.resetValidation();
  }
});

function onHide() {
  saving.value = false;
}

async function onSubmit() {
  if (!props.mantenimiento) return;
  const isValid = await formRef.value?.validate();
  if (!isValid) return;

  saving.value = true;
  try {
    await mantenimientosStore.realizarMantenimiento(props.mantenimiento.id, {
      comentariosRealizacion: comentarios.value,
      kmsMantenimiento: toNumberOrNull(kmsMantenimiento.value),
      horasMantenimiento: toNumberOrNull(horasMantenimiento.value),
    });
    $q.notify({ type: 'positive', color: 'teal-9', message: t('mantenimientoRealizar.success') });
    visible.value = false;
    emit('saved');
  } catch (error) {
    $q.notify({
      type: 'negative',
      color: 'red-9',
      message: getApiErrorMessage(error, t('mantenimientoRealizar.error')),
    });
    if (error instanceof AxiosError && error.response?.status === 409) {
      visible.value = false;
      emit('saved');
    }
  } finally {
    saving.value = false;
  }
}
</script>
