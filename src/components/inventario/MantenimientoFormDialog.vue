<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 520px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{ isEditMode ? t('mantenimientoForm.editTitle') : t('mantenimientoForm.createTitle') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="isEditMode && mantenimiento?.usuarioCreacion" class="q-pb-none">
        <q-chip dense outline color="teal-10" icon="person" style="max-width: 100%">
          <span class="ellipsis">{{
            t('mantenimientoForm.createdBy', { name: mantenimiento.usuarioCreacion.name })
          }}</span>
        </q-chip>
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-input
            v-model="fechaMantenimiento"
            outlined
            dense
            type="date"
            stack-label
            class="elegant-input"
            :label="t('mantenimientoForm.fechaMantenimientoLabel')"
            :rules="fechaRules"
            :error="!!serverErrors.fechaMantenimiento"
            :error-message="serverErrors.fechaMantenimiento"
            lazy-rules
            @update:model-value="clearServerError('fechaMantenimiento')"
          />

          <q-input
            v-model="descripcion"
            outlined
            dense
            type="textarea"
            autogrow
            class="elegant-input"
            :label="t('mantenimientoForm.descripcionLabel')"
            :rules="descripcionRules"
            :error="!!serverErrors.descripcion"
            :error-message="serverErrors.descripcion"
            lazy-rules
            @update:model-value="clearServerError('descripcion')"
          />

          <q-select
            v-model="prioridadId"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="elegant-input"
            :label="t('mantenimientoForm.prioridadLabel')"
            :options="prioridadOptions"
            :error="!!serverErrors.prioridadId"
            :error-message="serverErrors.prioridadId"
            @update:model-value="clearServerError('prioridadId')"
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
                :label="t('mantenimientoForm.kmsLabel')"
                :rules="nonNegativeRules"
                :error="!!serverErrors.kmsMantenimiento"
                :error-message="serverErrors.kmsMantenimiento"
                lazy-rules
                @update:model-value="clearServerError('kmsMantenimiento')"
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
                :label="t('mantenimientoForm.horasLabel')"
                :rules="nonNegativeRules"
                :error="!!serverErrors.horasMantenimiento"
                :error-message="serverErrors.horasMantenimiento"
                lazy-rules
                @update:model-value="clearServerError('horasMantenimiento')"
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
            :label="t('mantenimientoForm.costeLabel')"
            :rules="nonNegativeRules"
            :error="!!serverErrors.coste"
            :error-message="serverErrors.coste"
            lazy-rules
            @update:model-value="clearServerError('coste')"
          />

          <q-input
            v-if="isEditMode && mantenimiento?.fechaRealizacion"
            :model-value="realizacionText"
            outlined
            dense
            readonly
            class="elegant-input"
            :label="t('mantenimientoForm.realizadoEl')"
          />

          <q-input
            v-if="isEditMode && mantenimiento?.fechaCancelacion"
            :model-value="cancelacionText"
            outlined
            dense
            readonly
            class="elegant-input"
            :label="t('mantenimientoForm.canceladoEl')"
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
import { useMantenimientosStore, type Mantenimiento } from '@/stores/mantenimientos';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  elemInventarioId: number;
  mantenimiento: Mantenimiento | null;
  prioridadOptions: { label: string; value: number }[];
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t, locale } = useI18n();
const mantenimientosStore = useMantenimientosStore();

const isEditMode = computed(() => props.mantenimiento !== null);

const formRef = ref<QForm | null>(null);
const descripcion = ref('');
const fechaMantenimiento = ref<string | null>(null);
const prioridadId = ref<number | null>(null);
const kmsMantenimiento = ref<number | null>(null);
const horasMantenimiento = ref<number | null>(null);
const coste = ref<number | null>(null);
const saving = ref(false);
const serverErrors = ref<Record<string, string>>({});

const descripcionRules = [
  (val: string) => (val ?? '').length <= 255 || t('mantenimientoForm.descripcionTooLong'),
];
const fechaRules = [(val: string | null) => !!val || t('mantenimientoForm.fechaRequired')];
const nonNegativeRules = [
  (val: number | string | null) =>
    val === null || val === '' || Number(val) >= 0 || t('mantenimientoForm.nonNegative'),
];

// El API devuelve date-time; el selector de fecha solo admite YYYY-MM-DD.
function toDateInput(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

// `clearable` deja el campo en null o en '' según el navegador.
function toNumberOrNull(value: number | string | null): number | null {
  return value === null || value === '' ? null : Number(value);
}

// Texto de solo lectura «fecha · usuario»; sin usuario, solo la fecha.
function formatActionInfo(
  date: string | null | undefined,
  user: { name: string } | null | undefined,
) {
  if (!date) return '';
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00` : date);
  const formatted = Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(locale.value);
  return user?.name ? `${formatted} · ${user.name}` : formatted;
}

const realizacionText = computed(() =>
  formatActionInfo(props.mantenimiento?.fechaRealizacion, props.mantenimiento?.usuarioRealizacion),
);
const cancelacionText = computed(() =>
  formatActionInfo(props.mantenimiento?.fechaCancelacion, props.mantenimiento?.usuarioCancelacion),
);

function resetForm() {
  descripcion.value = props.mantenimiento?.descripcion ?? '';
  fechaMantenimiento.value = toDateInput(props.mantenimiento?.fechaMantenimiento);
  prioridadId.value = props.mantenimiento?.prioridadId ?? null;
  kmsMantenimiento.value = props.mantenimiento?.kmsMantenimiento ?? null;
  horasMantenimiento.value = props.mantenimiento?.horasMantenimiento ?? null;
  coste.value = props.mantenimiento?.coste ?? null;
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
    descripcion: descripcion.value,
    fechaMantenimiento: fechaMantenimiento.value,
    prioridadId: prioridadId.value,
    kmsMantenimiento: toNumberOrNull(kmsMantenimiento.value),
    horasMantenimiento: toNumberOrNull(horasMantenimiento.value),
    coste: toNumberOrNull(coste.value),
  };

  saving.value = true;
  serverErrors.value = {};
  try {
    if (props.mantenimiento) {
      await mantenimientosStore.updateMantenimiento(
        props.mantenimiento.id,
        props.elemInventarioId,
        form,
      );
      $q.notify({ type: 'positive', color: 'teal-9', message: t('mantenimientoForm.updated') });
    } else {
      await mantenimientosStore.createMantenimiento(props.elemInventarioId, form);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('mantenimientoForm.created') });
    }
    visible.value = false;
    emit('saved');
  } catch (error) {
    // Un 422 con errores por campo se muestra bajo cada campo; el diálogo sigue abierto.
    if (!applyServerErrors(error)) {
      $q.notify({
        type: 'negative',
        color: 'red-9',
        message: getApiErrorMessage(error, t('mantenimientoForm.saveError')),
      });
    }
  } finally {
    saving.value = false;
  }
}
</script>
