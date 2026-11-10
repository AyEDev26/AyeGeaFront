<template>
  <q-dialog v-model="visible" persistent @hide="onHide">
    <GlassCard style="width: 100%; min-width: 320px; max-width: 520px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-teal-10 font-outfit">
          {{ isEditMode ? t('revisionForm.editTitle') : t('revisionForm.createTitle') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="isEditMode && revision?.usuarioCreacion" class="q-pb-none">
        <q-chip dense outline color="teal-10" icon="person" style="max-width: 100%">
          <span class="ellipsis">{{
            t('revisionForm.createdBy', { name: revision.usuarioCreacion.name })
          }}</span>
        </q-chip>
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-y-md" @submit.prevent="onSubmit">
          <q-input
            v-model="fechaRevision"
            outlined
            dense
            type="date"
            stack-label
            class="elegant-input"
            :label="t('revisionForm.fechaRevisionLabel')"
            :rules="fechaRules"
            :error="!!serverErrors.fechaRevision"
            :error-message="serverErrors.fechaRevision"
            lazy-rules
            @update:model-value="clearServerError('fechaRevision')"
          />

          <q-input
            v-model="nombre"
            outlined
            dense
            class="elegant-input"
            :label="t('revisionForm.nombreLabel')"
            :rules="nombreRules"
            :error="!!serverErrors.nombre"
            :error-message="serverErrors.nombre"
            lazy-rules
            @update:model-value="clearServerError('nombre')"
          />

          <q-select
            v-model="prioridadId"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="elegant-input"
            :label="t('revisionForm.prioridadLabel')"
            :options="prioridadOptions"
            :error="!!serverErrors.prioridadId"
            :error-message="serverErrors.prioridadId"
            @update:model-value="clearServerError('prioridadId')"
          />

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
            :label="t('revisionForm.costeLabel')"
            :rules="costeRules"
            :error="!!serverErrors.coste"
            :error-message="serverErrors.coste"
            lazy-rules
            @update:model-value="clearServerError('coste')"
          />

          <q-input
            v-model="fechaProximaRevision"
            outlined
            dense
            clearable
            type="date"
            stack-label
            class="elegant-input"
            :label="t('revisionForm.fechaProximaRevisionLabel')"
            :error="!!serverErrors.fechaProximaRevision"
            :error-message="serverErrors.fechaProximaRevision"
            @update:model-value="clearServerError('fechaProximaRevision')"
          />

          <q-input
            v-if="isEditMode && revision?.fechaRealizacion"
            :model-value="realizacionText"
            outlined
            dense
            readonly
            class="elegant-input"
            :label="t('revisionForm.realizadoEl')"
          />

          <q-input
            v-if="isEditMode && revision?.fechaCancelacion"
            :model-value="cancelacionText"
            outlined
            dense
            readonly
            class="elegant-input"
            :label="t('revisionForm.canceladoEl')"
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
import { useRevisionesStore, type Revision } from '@/stores/revisiones';
import { getApiErrorMessage } from '@/utils/api-error';
import GlassCard from '@/components/common/GlassCard.vue';

const props = defineProps<{
  elemInventarioId: number;
  revision: Revision | null;
  prioridadOptions: { label: string; value: number }[];
}>();

const emit = defineEmits<{
  saved: [];
}>();

const visible = defineModel<boolean>({ required: true });

const $q = useQuasar();
const { t, locale } = useI18n();
const revisionesStore = useRevisionesStore();

const isEditMode = computed(() => props.revision !== null);

const formRef = ref<QForm | null>(null);
const nombre = ref('');
const fechaRevision = ref<string | null>(null);
const fechaProximaRevision = ref<string | null>(null);
const prioridadId = ref<number | null>(null);
const coste = ref<number | null>(null);
const saving = ref(false);
const serverErrors = ref<Record<string, string>>({});

const nombreRules = [(val: string) => (val ?? '').length <= 50 || t('revisionForm.nombreTooLong')];
const fechaRules = [(val: string | null) => !!val || t('revisionForm.fechaRevisionRequired')];
const costeRules = [
  (val: number | string | null) =>
    val === null || val === '' || Number(val) >= 0 || t('revisionForm.costeInvalid'),
];

// El API devuelve date-time; el selector de fecha solo admite YYYY-MM-DD.
function toDateInput(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
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
  formatActionInfo(props.revision?.fechaRealizacion, props.revision?.usuarioRealizacion),
);
const cancelacionText = computed(() =>
  formatActionInfo(props.revision?.fechaCancelacion, props.revision?.usuarioCancelacion),
);

function resetForm() {
  nombre.value = props.revision?.nombre ?? '';
  fechaRevision.value = toDateInput(props.revision?.fechaRevision);
  fechaProximaRevision.value = toDateInput(props.revision?.fechaProximaRevision);
  prioridadId.value = props.revision?.prioridadId ?? null;
  coste.value = props.revision?.coste ?? null;
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
    nombre: nombre.value,
    fechaRevision: fechaRevision.value,
    fechaProximaRevision: fechaProximaRevision.value,
    prioridadId: prioridadId.value,
    coste: coste.value === null || (coste.value as unknown) === '' ? null : Number(coste.value),
  };

  saving.value = true;
  serverErrors.value = {};
  try {
    if (props.revision) {
      await revisionesStore.updateRevision(props.revision.id, props.elemInventarioId, form);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('revisionForm.updated') });
    } else {
      await revisionesStore.createRevision(props.elemInventarioId, form);
      $q.notify({ type: 'positive', color: 'teal-9', message: t('revisionForm.created') });
    }
    visible.value = false;
    emit('saved');
  } catch (error) {
    // Un 422 con errores por campo se muestra bajo cada campo; el diálogo sigue abierto.
    if (!applyServerErrors(error)) {
      $q.notify({
        type: 'negative',
        color: 'red-9',
        message: getApiErrorMessage(error, t('revisionForm.saveError')),
      });
    }
  } finally {
    saving.value = false;
  }
}
</script>
