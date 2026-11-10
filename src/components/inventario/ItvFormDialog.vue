<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 520px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{ isEditMode ? t('itvForm.editTitle') : t('itvForm.createTitle') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="isEditMode && itv?.usuarioCreacion" class="q-pb-none">
        <q-chip dense outline color="teal-10" icon="person" style="max-width: 100%">
          <span class="ellipsis">{{
            t('itvForm.createdBy', { name: itv.usuarioCreacion.name })
          }}</span>
        </q-chip>
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-input
            v-model="fechaItv"
            outlined
            dense
            type="date"
            stack-label
            class="elegant-input"
            :label="t('itvForm.fechaItvLabel')"
            :rules="fechaRules"
            :error="!!serverErrors.fechaItv"
            :error-message="serverErrors.fechaItv"
            lazy-rules
            @update:model-value="clearServerError('fechaItv')"
          />

          <q-input
            v-model="resultado"
            outlined
            dense
            class="elegant-input"
            :label="t('itvForm.resultadoLabel')"
            :rules="resultadoRules"
            :error="!!serverErrors.resultado"
            :error-message="serverErrors.resultado"
            lazy-rules
            @update:model-value="clearServerError('resultado')"
          />

          <q-input
            v-model="observaciones"
            outlined
            dense
            type="textarea"
            autogrow
            class="elegant-input"
            :label="t('itvForm.observacionesLabel')"
            :rules="observacionesRules"
            :error="!!serverErrors.observaciones"
            :error-message="serverErrors.observaciones"
            lazy-rules
            @update:model-value="clearServerError('observaciones')"
          />

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="kmsItv"
                outlined
                dense
                clearable
                type="number"
                min="0"
                class="elegant-input"
                :label="t('itvForm.kmsLabel')"
                :rules="nonNegativeRules"
                :error="!!serverErrors.kmsItv"
                :error-message="serverErrors.kmsItv"
                lazy-rules
                @update:model-value="clearServerError('kmsItv')"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="horasItv"
                outlined
                dense
                clearable
                type="number"
                min="0"
                class="elegant-input"
                :label="t('itvForm.horasLabel')"
                :rules="nonNegativeRules"
                :error="!!serverErrors.horasItv"
                :error-message="serverErrors.horasItv"
                lazy-rules
                @update:model-value="clearServerError('horasItv')"
              />
            </div>
          </div>

          <q-input
            v-model.number="coste"
            outlined
            dense
            clearable
            type="number"
            min="0"
            step="0.01"
            suffix="€"
            class="elegant-input"
            :label="t('itvForm.costeLabel')"
            :rules="nonNegativeRules"
            :error="!!serverErrors.coste"
            :error-message="serverErrors.coste"
            lazy-rules
            @update:model-value="clearServerError('coste')"
          />

          <q-input
            v-model="fechaProximaItv"
            outlined
            dense
            clearable
            type="date"
            stack-label
            class="elegant-input"
            :label="t('itvForm.fechaProximaItvLabel')"
            :error="!!serverErrors.fechaProximaItv"
            :error-message="serverErrors.fechaProximaItv"
            @update:model-value="clearServerError('fechaProximaItv')"
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
import { AxiosError } from 'axios';
import { useQuasar, type QForm } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useItvsStore, type Itv } from '@/stores/itvs';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  elemInventarioId: number;
  itv: Itv | null;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t } = useI18n();
const itvsStore = useItvsStore();

const isEditMode = computed(() => props.itv !== null);

const formRef = ref<QForm | null>(null);
const fechaItv = ref<string | null>(null);
const fechaProximaItv = ref<string | null>(null);
const resultado = ref('');
const observaciones = ref('');
const kmsItv = ref<number | null>(null);
const horasItv = ref<number | null>(null);
const coste = ref<number | null>(null);
const saving = ref(false);
const serverErrors = ref<Record<string, string>>({});

const fechaRules = [(val: string | null) => !!val || t('itvForm.fechaRequired')];
const resultadoRules = [
  (val: string) => (val ?? '').length <= 100 || t('itvForm.resultadoTooLong'),
];
const observacionesRules = [
  (val: string) => (val ?? '').length <= 255 || t('itvForm.observacionesTooLong'),
];
const nonNegativeRules = [
  (val: number | string | null) =>
    val === null || val === '' || Number(val) >= 0 || t('itvForm.nonNegative'),
];

// El API devuelve date-time; el selector de fecha solo admite YYYY-MM-DD.
function toDateInput(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

// `clearable` deja el campo en null o en '' según el navegador.
function toNumberOrNull(value: number | string | null): number | null {
  return value === null || value === '' ? null : Number(value);
}

function resetForm() {
  fechaItv.value = toDateInput(props.itv?.fechaItv);
  fechaProximaItv.value = toDateInput(props.itv?.fechaProximaItv);
  resultado.value = props.itv?.resultado ?? '';
  observaciones.value = props.itv?.observaciones ?? '';
  kmsItv.value = props.itv?.kmsItv ?? null;
  horasItv.value = props.itv?.horasItv ?? null;
  coste.value = props.itv?.coste ?? null;
  serverErrors.value = {};
  formRef.value?.resetValidation();
}

watch(visible, (isVisible) => {
  if (isVisible) resetForm();
});

function clearServerError(field: string) {
  if (serverErrors.value[field]) {
    const rest = { ...serverErrors.value };
    delete rest[field];
    serverErrors.value = rest;
  }
}

function snakeToCamel(text: string) {
  return text.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

// Convierte `errors` de un 422 en errores por campo. Devuelve true si mapeó alguno.
function applyServerErrors(error: unknown): boolean {
  if (!(error instanceof AxiosError) || error.response?.status !== 422) return false;
  const errors = (error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;
  if (!errors) return false;
  const mapped: Record<string, string> = {};
  for (const [key, messages] of Object.entries(errors)) {
    const message = messages?.[0];
    if (message) mapped[snakeToCamel(key)] = message;
  }
  serverErrors.value = mapped;
  return Object.keys(mapped).length > 0;
}

function onHide() {
  saving.value = false;
}

async function onSubmit() {
  const isValid = await formRef.value?.validate();
  if (!isValid) return;

  const form = {
    fechaItv: fechaItv.value,
    fechaProximaItv: fechaProximaItv.value || null,
    resultado: resultado.value,
    observaciones: observaciones.value,
    kmsItv: toNumberOrNull(kmsItv.value),
    horasItv: toNumberOrNull(horasItv.value),
    coste: toNumberOrNull(coste.value),
  };

  saving.value = true;
  serverErrors.value = {};
  try {
    if (props.itv) {
      await itvsStore.updateItv(props.itv.id, props.elemInventarioId, form);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('itvForm.updated') });
    } else {
      await itvsStore.createItv(props.elemInventarioId, form);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('itvForm.created') });
    }
    visible.value = false;
    emit('saved');
  } catch (error) {
    // Un 422 con errores por campo se muestra bajo cada campo; el diálogo sigue abierto.
    if (!applyServerErrors(error)) {
      $q.notify({
        type: 'negative',
        color: 'red-9',
        message: getApiErrorMessage(error, t('itvForm.saveError')),
      });
    }
  } finally {
    saving.value = false;
  }
}
</script>
